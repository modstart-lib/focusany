import * as remoteMain from '@electron/remote/main'
import { BrowserView, BrowserWindow, desktopCapturer, nativeImage, screen, shell, WebContents } from 'electron'
import { ActionRecord, PluginRecord, PluginState } from '../../../../src/types/Manager'
import { t } from '../../../config/lang'
import { WindowConfig } from '../../../config/window'
import { DevToolsManager } from '../../../lib/devtools'
import { isMac } from '../../../lib/env'
import { preloadDefault, rendererIsUrl, rendererLoadPath } from '../../../lib/env-main'
import { HotKeyUtil } from '../../../lib/util'
import { AppsMain } from '../../app/main'
import { AppEnv, AppRuntime } from '../../env'
import { Events } from '../../event/main'
import { Log } from '../../log/main'
import StorageMain from '../../storage/main'
import { executeDarkMode, executeHooks, executePluginHooks } from '../lib/hooks'
import { ManagerPlugin } from '../plugin'
import { ManagerPluginEvent } from '../plugin/event'
import { PluginLog } from '../plugin/log'
import { ManagerSystem } from '../system'
import { PluginContext } from '../type'
import { RemoteWebManager } from './remoteWeb'

const browserViews = new Map<WebContents, BrowserView>()
const detachWindows = new Map<WebContents, BrowserWindow>()
let mainWindowView: BrowserView | null = null
const mainPluginActionCode = {
    view: null as BrowserView | null,
    action: null as ActionRecord | null,
    codeData: null,
    items: [] as {
        id: string
        [key: string]: any
    }[],
}

type OpenOptionType = {
    type: 'action' | 'callPage'
    callPage?: {
        type: string
        data: any
        option: CallPageOption
        onResult: (result: { code: number; msg: string; data?: any }) => void
    }
}

type OpenShowWindowOption = {
    loadUrl: () => void
    pluginState: PluginState
    width: number
    height: number
    option: OpenOptionType
}

const addBrowserViews = (view: BrowserView) => {
    browserViews.set(view.webContents, view)
}

const removeBrowserViews = (view: BrowserView) => {
    browserViews.delete(view.webContents)
}

const addDetachWindows = (win: BrowserWindow) => {
    detachWindows.set(win.webContents, win)
}

const removeDetachWindows = (win: BrowserWindow) => {
    detachWindows.delete(win.webContents)
}

const isBrowserViewAlive = (view?: BrowserView | null) => {
    try {
        return !!view?.webContents && !view.webContents.isDestroyed()
    } catch {
        return false
    }
}

const isBrowserWindowAlive = (win?: BrowserWindow | null) => {
    try {
        return !!win && !win.isDestroyed()
    } catch {
        return false
    }
}

/**
 * 检测窗口 bounds 是否至少部分落在某个显示器的可见区域内，
 * 用于判断缓存的窗口位置在重新打开时是否仍然有效（防止显示器变更后窗口出现在屏幕外）。
 */
const isBoundsVisible = (bounds: Electron.Rectangle | null | undefined): boolean => {
    if (!bounds || typeof bounds.x !== 'number' || typeof bounds.y !== 'number') {
        return false
    }
    if (
        typeof bounds.width !== 'number' ||
        typeof bounds.height !== 'number' ||
        bounds.width <= 0 ||
        bounds.height <= 0
    ) {
        return false
    }
    const minVisible = 50
    return screen.getAllDisplays().some((display) => {
        const area = display.workArea
        const overlapWidth = Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x)
        const overlapHeight = Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y)
        return overlapWidth >= minVisible && overlapHeight >= minVisible
    })
}

const DETACH_WINDOW_BOUNDS_GROUP = 'detachWindowBounds'
const detachWindowBoundsCache: Record<string, Electron.Rectangle> = {}

// detach 窗口底部圆角半径（macOS）。BrowserView 内容底部留出该高度，
// 由外壳背景填充圆角区域，使窗口四角圆角一致（顶部系统红绿灯已是圆角）。
const DETACH_WINDOW_CORNER_RADIUS = 12

/** 获取某个插件分离窗口上次保存的窗口 bounds，无缓存或已不在可见区域内时返回 null */
const getDetachWindowBounds = async (pluginName: string): Promise<Electron.Rectangle | null> => {
    const bounds = await StorageMain.get(DETACH_WINDOW_BOUNDS_GROUP, pluginName, null)
    if (!isBoundsVisible(bounds)) {
        return null
    }
    return bounds as Electron.Rectangle
}

/** 保存某个插件分离窗口的窗口 bounds（内存缓存 + 落盘） */
const saveDetachWindowBounds = (pluginName: string, bounds: Electron.Rectangle) => {
    detachWindowBoundsCache[pluginName] = bounds
    StorageMain.set(DETACH_WINDOW_BOUNDS_GROUP, pluginName, bounds).then()
}

/** 读取某个插件分离窗口的窗口 bounds（优先内存缓存） */
const readDetachWindowBounds = async (pluginName: string): Promise<Electron.Rectangle | null> => {
    if (isBoundsVisible(detachWindowBoundsCache[pluginName])) {
        return detachWindowBoundsCache[pluginName]
    }
    return getDetachWindowBounds(pluginName)
}

const checkForHotkey = async (view: PluginContext, input: Electron.Input) => {
    if (view._event && view._event['Hotkey']) {
        const hotkey = HotKeyUtil.getFromEvent(input)
        if (hotkey) {
            view._event['Hotkey'].forEach(({ id, hotkeys }) => {
                if (HotKeyUtil.match(hotkeys, hotkey)) {
                    executePluginHooks(view as BrowserView, 'Hotkey', { id, hotkey })
                }
            })
        }
    }
}

export const ManagerWindow = {
    listBrowserViews(): BrowserView[] {
        return Array.from(browserViews.values())
    },
    listDetachWindows(): BrowserWindow[] {
        return Array.from(detachWindows.values())
    },
    getViewByWebContents: (webContents: any) => {
        // console.log('getViewByWebContents.value', webContents)
        let view = browserViews.get(webContents)
        if (view) {
            return view
        }
        const iterator = browserViews.entries()
        while (true) {
            const { value, done } = iterator.next()
            if (done) {
                break
            }
            // console.log('getViewByWebContents.value.start', value[1], value[1]._window)
            if (isBrowserWindowAlive(value[1]._window) && value[1]._window.webContents === webContents) {
                return value[1]
            }
        }
        return null
    },
    async detachWindowOperate(type: 'open' | 'close', action: ActionRecord) {
        let win = null
        for (const w of ManagerWindow.listDetachWindows()) {
            if (w.id === action.runtime.windowId) {
                win = w
                break
            }
        }
        if (!win) {
            throw 'DetachWindowNotFound'
        }
        if (type === 'open') {
            win.show()
            win.focus()
        } else {
            win.close()
        }
        AppRuntime.mainWindow.setSize(WindowConfig.mainWidth, WindowConfig.mainHeight)
        setTimeout(() => {
            AppRuntime.mainWindow.hide()
        }, 100)
    },
    async _logPluginViewError(view: BrowserView, plugin: PluginRecord) {
        view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            PluginLog.error(plugin.name, 'Load.Error-did-fail-load', {
                errorCode,
                errorDescription,
                validatedURL,
            })
        })
        view.webContents.on('did-fail-provisional-load', (event, errorCode, errorDescription, validatedURL) => {
            PluginLog.error(plugin.name, 'Load.Error-did-fail-provisional-load', {
                errorCode,
                errorDescription,
                validatedURL,
            })
        })
        view.webContents.on('preload-error', (event, preloadPath, error) => {
            PluginLog.error(plugin.name, 'Load.Error-preload-error', {
                error: error + '',
                preloadPath,
            })
        })
        view.webContents.on('render-process-gone', () => {
            PluginLog.error(plugin.name, 'Load.Error-render-process-gone', {
                error: 'render-process-gone',
            })
        })
    },
    async _pluginViewLoad(view: BrowserView, main: string) {
        const pluginName = view._plugin?.name || 'Unknown'
        try {
            if (!isBrowserViewAlive(view)) {
                return
            }
            if (rendererIsUrl(main)) {
                await view.webContents.loadURL(main)
            } else {
                await view.webContents.loadFile(main)
            }
        } catch (e) {
            if (isBrowserViewAlive(view)) {
                await view.webContents.loadURL('about:blank').catch(() => {})
            }
            PluginLog.error(pluginName, 'Load.Error-loadUrl', {
                error: e + '',
                main,
            })
        }
    },
    async _pluginActionCodeEnd() {
        if (mainPluginActionCode.view) {
            AppRuntime.mainWindow.removeBrowserView(mainPluginActionCode.view)
            removeBrowserViews(mainPluginActionCode.view)
            if (ManagerPlugin.isDevelopmentCheck(mainPluginActionCode.view._plugin, 'keepCodeDevTools')) {
                PluginLog.info(mainPluginActionCode.view._plugin.name, 'ManagerWindow.KeepCodeDevTools', {
                    action: mainPluginActionCode.action,
                    codeData: mainPluginActionCode.codeData,
                })
            } else {
                // @ts-ignore
                mainPluginActionCode.view.webContents?.destroy()
                mainPluginActionCode.view = null
            }
        }
        mainPluginActionCode.action = null
        mainPluginActionCode.codeData = null
        mainPluginActionCode.items = []
    },
    async _viewCodeCallJs(js: string) {
        return await mainPluginActionCode.view.webContents.executeJavaScript(`(async()=>{ ${js} })();`)
    },
    async actionCodeExecute(id: string | null = null, keywords: string | null = null) {
        let item: ActionCodeExecuteResultItem | null = null
        if (id) {
            item = mainPluginActionCode.items.find((i) => i.id === id) as ActionCodeExecuteResultItem
        }
        try {
            let hasLoading = false
            if (!(item && 'loading' in item && !item['loading'])) {
                await executeHooks(AppRuntime.mainWindow, 'PluginCodeSetting', {
                    loading: true,
                })
                hasLoading = true
            }
            let value: ActionCodeExecuteResult = await this._viewCodeCallJs(
                `return await window.exports.code['${mainPluginActionCode.action.name}'].execute(
                    ${JSON.stringify(item)},
                    ${JSON.stringify(keywords)},
                    ${JSON.stringify(mainPluginActionCode.codeData)}
                );`,
            )
            if (!value) {
                value = { command: 'none' } as ActionCodeExecuteResult
            }
            if (hasLoading) {
                await executeHooks(AppRuntime.mainWindow, 'PluginCodeSetting', {
                    loading: false,
                })
            }
            // console.log('ManagerWindow.openActionCode.value', JSON.stringify(value))
            const plugin: PluginRecord = mainPluginActionCode.view._plugin
            if (value.placeholder) {
                await executeHooks(AppRuntime.mainWindow, 'PluginCodeSetting', {
                    placeholder: value.placeholder,
                })
            }
            if ('data' === value.command) {
                mainPluginActionCode.items = value.items || []
                // icon path
                mainPluginActionCode.items.forEach((item) => {
                    if (
                        item.icon &&
                        !item.icon.startsWith('http:') &&
                        !item.icon.startsWith('file:') &&
                        !item.icon.startsWith('data:')
                    ) {
                        item.icon = `file://${plugin.runtime.root}/${item.icon}`
                    }
                })
                await executeHooks(AppRuntime.mainWindow, 'PluginCodeData', {
                    items: value.items,
                })
            } else if ('close' === value.command) {
                await this.close()
                AppRuntime.mainWindow.hide()
            } else if ('error' === value.command) {
                await executeHooks(AppRuntime.mainWindow, 'PluginCodeSetting', {
                    error: value.error,
                })
            } else if ('clear' === value.command) {
                await this.close()
            } else if ('none' === value.command) {
                // do nothing
            } else {
                throw `ManagerWindow.OpenActionCode.CommandError:${value.command}`
            }
        } catch (e) {
            await executeHooks(AppRuntime.mainWindow, 'PluginCodeSetting', {
                error: e + '',
            })
            PluginLog.error(mainPluginActionCode.view._plugin.name, 'Code.Error', {
                error: e + '',
                action: mainPluginActionCode.action,
            })
        }
    },
    async openForCode(
        plugin: PluginRecord,
        action: ActionRecord,
        option?: {
            codeData?: any
        },
    ) {
        const { nodeIntegration, preloadBase, preload, main } = await ManagerPlugin.getInfo(plugin)
        // console.log('openForCode', {preload, main})
        const viewSession = await ManagerPlugin.getViewSession(plugin)
        if (preloadBase) {
            viewSession.setPreloads([preloadBase])
        }
        const view = new BrowserView({
            webPreferences: {
                webSecurity: false,
                nodeIntegration,
                contextIsolation: false,
                sandbox: false,
                devTools: true,
                webviewTag: true,
                preload,
                session: viewSession,
                defaultFontSize: 14,
                defaultFontFamily: {
                    standard: 'system-ui',
                    serif: 'system-ui',
                },
                spellcheck: false,
            },
        })
        mainPluginActionCode.view = view
        mainPluginActionCode.action = action
        mainPluginActionCode.codeData = option?.codeData || null
        await ManagerWindow._logPluginViewError(view, plugin)
        addBrowserViews(view)
        view._plugin = plugin
        view._window = AppRuntime.mainWindow
        remoteMain.enable(view.webContents)
        AppRuntime.mainWindow.addBrowserView(view)
        ManagerWindow._pluginViewLoad(view, main).then()
        DevToolsManager.register(`MainCodeView.${plugin.name}`, view)
        const logPluginError = (e) => {
            PluginLog.error(plugin.name, 'Code.Error', {
                error: e + '',
                action,
                option,
            })
        }
        const endView = () => {
            setTimeout(() => {
                this._pluginActionCodeEnd()
            }, 1000)
            AppRuntime.mainWindow.hide()
        }
        AppRuntime.mainWindow.setSize(WindowConfig.pluginWidth, WindowConfig.mainHeight)
        return new Promise((resolve, reject) => {
            view.webContents.once('dom-ready', async () => {
                DevToolsManager.autoShow(view)
                if (ManagerPlugin.isDevelopmentCheck(plugin, 'showCodeDevTools')) {
                    view.webContents.openDevTools({
                        mode: 'detach',
                        activate: true,
                        title: `MainPluginCodeView.${plugin.name}`,
                    })
                }
                view.setBounds({
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                })
                try {
                    const codeType = await this._viewCodeCallJs(`return typeof window.exports.code['${action.name}'];`)
                    if ('function' === codeType) {
                        const value = await this._viewCodeCallJs(
                            `return await window.exports.code['${action.name}'](${JSON.stringify(mainPluginActionCode.codeData)});`,
                        )
                        resolve(value)
                        endView()
                    } else {
                        const codeSetting = await this._viewCodeCallJs(
                            `return window.exports.code['${action.name}'].setting;`,
                        )
                        if (!codeSetting) {
                            throw `ManagerWindow.OpenForCode.SettingEmpty`
                        }
                        await executeHooks(AppRuntime.mainWindow, 'PluginCodeInit', {
                            plugin: plugin,
                            type: codeSetting.type || 'list',
                            placeholder: codeSetting.placeholder || t('store.searchPlaceholder'),
                        })
                        this.actionCodeExecute().then()
                        resolve(null)
                    }
                } catch (e) {
                    logPluginError(e)
                    reject(e)
                    endView()
                }
            })
        })
    },
    async open(plugin: PluginRecord, action?: ActionRecord, option?: OpenOptionType) {
        option = Object.assign(
            {
                type: 'action',
                callPage: {},
            },
            option,
        )
        const { nodeIntegration, preloadBase, preload, main, width, height, autoDetach, singleton, zoom } =
            await ManagerPlugin.getInfo(plugin)
        // console.log('ManagerWindow.open', {nodeIntegration, preload, main, width, height, autoDetach})
        const readyData = {}
        readyData['actionName'] = action?.name || null
        readyData['actionMatch'] = action?.runtime?.match || null
        readyData['actionMatchFiles'] = action?.runtime?.matchFiles || []
        readyData['requestId'] = action?.runtime?.requestId || null
        readyData['reenter'] = false
        readyData['isView'] = false
        readyData['type'] = option.type
        if (option.type === 'action' && singleton) {
            for (const v of this.listBrowserViews()) {
                if (v._plugin.name === plugin.name) {
                    if (!v._window) {
                        continue
                    }
                    v._window.show()
                    v._window.focus()
                    await executeHooks(AppRuntime.mainWindow, 'PluginAlreadyOpened', {})
                    readyData['reenter'] = true
                    await executePluginHooks(v, 'PluginReady', readyData)
                    return
                }
            }
        }
        const viewSession = await ManagerPlugin.getViewSession(plugin)
        if (preloadBase) {
            viewSession.setPreloads([preloadBase])
        }
        if (plugin.setting.remoteWebCacheEnable) {
            await RemoteWebManager.create(plugin)
        }
        // console.log('preload', {preloadPluginDefault, preload})
        const view = new BrowserView({
            webPreferences: {
                webSecurity: false,
                nodeIntegration,
                contextIsolation: false,
                allowRunningInsecureContent: true,
                sandbox: false,
                devTools: true,
                webviewTag: true,
                preload,
                session: viewSession,
                defaultFontSize: 14,
                defaultFontFamily: {
                    standard: 'system-ui',
                    serif: 'system-ui',
                },
                spellcheck: false,
                // 隐藏窗口也持续渲染：否则主窗口隐藏时 capturePage 只能得到初始帧
                backgroundThrottling: false,
            },
        })
        await ManagerWindow._logPluginViewError(view, plugin)
        addBrowserViews(view)
        view._plugin = plugin
        remoteMain.enable(view.webContents)
        DevToolsManager.register(`PluginView.${plugin.name}`, view)
        view.webContents.once('dom-ready', async () => {
            await executeDarkMode(view, {
                plugin,
                isSystem: ManagerSystem.match(plugin.name),
            })
            Events.sendRaw(view.webContents, 'APP_READY', {
                name: plugin.name,
                AppEnv,
            })
        })
        view.webContents.once('did-frame-finish-load', () => {
            // console.log('setZoomFactor', zoom / 100)
            setTimeout(() => {
                view.webContents.setZoomFactor(zoom / 100)
            }, 0)
        })
        view.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith('https://') || url.startsWith('http://')) {
                shell.openExternal(url)
            }
            return { action: 'deny' }
        })
        view.setAutoResize({ width: true, height: true })
        // console.log('ManagerWindow.open', {nodeIntegration, preload, main, width, height, autoDetach})
        view.webContents.once('dom-ready', async () => {
            DevToolsManager.autoShow(view)
            if (ManagerPlugin.isDevelopmentCheck(plugin, 'showDevTools')) {
                view.webContents.openDevTools({
                    mode: 'detach',
                    activate: true,
                    title: `PluginView.${plugin.name}`,
                })
            }
            if (option.type === 'callPage') {
                Events.callPage(view.webContents, option.callPage.type, option.callPage.data, option.callPage.option)
                    .then((result) => {
                        option.callPage.onResult(result)
                    })
                    .catch((e) => {
                        option.callPage.onResult({ code: -1, msg: e + '' })
                    })
                    .finally(() => {
                        if (option.callPage.option.autoClose) {
                            setTimeout(() => {
                                view._window.close()
                            }, 1000)
                        }
                    })
                readyData['isView'] = true
            }
        })
        view.webContents.on('before-input-event', (event, input) => {
            // console.log('Load.Error-before-input-event', input)
            if (input.type === 'keyUp') {
                // exit when Escape key is pressed
                if (mainWindowView === view) {
                    if (input.key === 'Escape') {
                        if (!(input.meta || input.control || input.shift || input.alt)) {
                            if (mainWindowView) {
                                ManagerWindow.close()
                                AppRuntime.mainWindow.webContents.focus()
                            }
                        }
                    }
                } else {
                    if (input.key === 'Escape') {
                        if (!(input.meta || input.control || input.shift || input.alt)) {
                            view._window.isFullScreen() && view._window.setFullScreen(false)
                        }
                    }
                }
            } else if (input.type === 'keyDown') {
                checkForHotkey(view as any, input)
            }
        })
        const windowOption: OpenShowWindowOption = {
            width,
            height,
            pluginState: {
                value: '',
                placeholder: '',
                isVisible: false,
            },
            loadUrl: async () => {
                await ManagerWindow._pluginViewLoad(view, main)
            },
            option,
        }
        // 分离模式窗口打开前先同步隐藏主窗口，避免 Alt+C 等快捷唤起时主窗口闪现
        if (autoDetach && !process.env.FOCUSANY_SCREENSHOT_SERVER && AppRuntime.mainWindow?.isVisible()) {
            AppRuntime.mainWindow.hide()
        }
        setTimeout(async () => {
            try {
                if (!isBrowserViewAlive(view)) {
                    return
                }
                if (autoDetach || option.type === 'callPage') {
                    await this._showInDetachWindow(view, windowOption)
                } else {
                    await this._showInMainWindow(view, windowOption)
                }
                if (!isBrowserViewAlive(view)) {
                    return
                }
                // Log.info('open.PluginReady', JSON.stringify({readyData, action}))
                await executePluginHooks(view, 'PluginReady', readyData)
            } catch (e) {
                PluginLog.error(view._plugin.name, 'Load.Error-showWindow', {
                    error: e + '',
                })
            }
        }, 0)
    },
    async subInputChange(win: BrowserWindow, keywords: string) {
        const views = win.getBrowserViews()
        for (const view of views) {
            if (AppRuntime.mainWindow === win && view !== mainWindowView) {
                continue
            }
            await executePluginHooks(view, 'SubInputChange', keywords)
        }
    },
    async close(
        plugin?: PluginRecord,
        option?: {
            window?: BrowserWindow
            openForNext?: boolean
        },
    ) {
        option = Object.assign(
            {
                openForNext: false,
            },
            option,
        )
        if (mainWindowView && (!plugin || mainWindowView._plugin.name === plugin.name)) {
            await executePluginHooks(mainWindowView, 'PluginExit', null).then()
            await executeHooks(AppRuntime.mainWindow, 'PluginExit', {
                openForNext: option.openForNext,
            })
            removeBrowserViews(mainWindowView)
            AppRuntime.mainWindow.removeBrowserView(mainWindowView)
            // @ts-ignore
            mainWindowView.webContents?.destroy()
            mainWindowView = null
        } else if (mainPluginActionCode.view && (!plugin || mainPluginActionCode.view._plugin.name === plugin.name)) {
            await executeHooks(AppRuntime.mainWindow, 'PluginCodeExit', {})
            await this._pluginActionCodeEnd()
        } else {
            // detach的插件窗口
            if (option.window) {
                option.window.close()
            } else {
                Log.error('ManagerWindow.close', 'windowNotFound')
            }
        }
    },
    async openMainPluginDevTools(option?: {}) {
        const devToolsWin = DevToolsManager.getWindow(mainWindowView)
        if (devToolsWin) {
            devToolsWin.close()
        } else if (mainWindowView) {
            if (mainWindowView.webContents.isDevToolsOpened()) {
                mainWindowView.webContents.closeDevTools()
            } else {
                mainWindowView.webContents.openDevTools({
                    mode: 'detach',
                    activate: true,
                    title: `MainPluginView`,
                })
            }
        } else if (mainPluginActionCode.view) {
            if (mainPluginActionCode.view.webContents.isDevToolsOpened()) {
                mainPluginActionCode.view.webContents.closeDevTools()
            } else {
                mainPluginActionCode.view.webContents.openDevTools({
                    mode: 'detach',
                    activate: true,
                    title: `MainPluginCodeView.${mainPluginActionCode.view._plugin.name}`,
                })
            }
        } else {
            Log.error('ManagerWindow.openMainPluginDevTools', 'mainWindowViewNotFound')
        }
    },
    async _showInMainWindow(view: BrowserView, option: OpenShowWindowOption) {
        if (!isBrowserViewAlive(view)) {
            return
        }
        if (!(await ManagerPluginEvent.isMainWindowShown(null, null))) {
            await ManagerPluginEvent.showMainWindow(null, null)
        }
        if (!isBrowserViewAlive(view)) {
            return
        }
        // console.log('showInMainWindow', view._plugin.name, option)
        if (mainWindowView) {
            await this.close(mainWindowView._plugin, {
                openForNext: true,
            })
            mainWindowView = null
        }
        if (!isBrowserViewAlive(view)) {
            return
        }
        view._window = AppRuntime.mainWindow
        mainWindowView = view
        AppRuntime.mainWindow.addBrowserView(view)
        AppRuntime.mainWindow.setSize(option.width, WindowConfig.mainHeight + option.height)
        const pluginParam = {}
        const pluginState: PluginState = {
            value: '',
            placeholder: '',
            isVisible: false,
        }
        const pluginInitReadyParam = {
            plugin: view._plugin,
            state: pluginState,
            param: pluginParam,
        }
        await executeHooks(view._window, 'PluginInit', pluginInitReadyParam)
        if (!isBrowserViewAlive(view)) {
            return
        }
        view.webContents.once('dom-ready', async () => {
            if (!isBrowserViewAlive(view)) {
                return
            }
            await executeHooks(view._window, 'PluginInitReady', pluginInitReadyParam)
            if (!isBrowserViewAlive(view)) {
                return
            }
            view.setBounds({
                x: 0,
                y: WindowConfig.mainHeight,
                width: option.width,
                height: option.height,
            })
            AppRuntime.mainWindow.focus()
        })
        await option.loadUrl()
    },
    async _showInDetachWindow(view: BrowserView, option: OpenShowWindowOption) {
        if (!isBrowserViewAlive(view)) {
            return
        }
        const plugin = view._plugin
        let alwaysOnTop = false
        if (plugin.setting?.detachAlwaysOnTop) {
            alwaysOnTop = true
        }
        const { x, y } = AppsMain.calcPositionInCurrentDisplay(
            plugin.setting?.detachPosition || 'center',
            option.width,
            option.height + WindowConfig.detachWindowTitleHeight,
        )
        // 优先恢复该插件上次关闭时的窗口位置与大小，否则使用配置的默认位置/大小
        let winX = x
        let winY = y
        let winWidth = option.width
        let winHeight = option.height + WindowConfig.detachWindowTitleHeight
        const savedBounds = await readDetachWindowBounds(plugin.name)
        if (savedBounds) {
            winX = savedBounds.x
            winY = savedBounds.y
            winWidth = savedBounds.width
            winHeight = savedBounds.height
        }
        let win: BrowserWindow | undefined = new BrowserWindow({
            height: winHeight,
            width: winWidth,
            autoHideMenuBar: true,
            titleBarStyle: 'hidden',
            trafficLightPosition: { x: 10, y: 11 },
            title: plugin.title,
            resizable: true,
            frame: false,
            show: false,
            transparent: isMac,
            enableLargerThanScreen: true,
            backgroundColor: '#fff',
            roundedCorners: true,
            alwaysOnTop,
            x: winX,
            y: winY,
            webPreferences: {
                webSecurity: false,
                allowRunningInsecureContent: true,
                backgroundThrottling: false,
                nodeIntegration: true,
                contextIsolation: false,
                webviewTag: true,
                devTools: true,
                navigateOnDragDrop: true,
                spellcheck: false,
                preload: preloadDefault,
            },
        })
        win._name = `DetachWindow.${view._plugin.name}`
        win._plugin = view._plugin
        win._type = option.option.type
        view._window = win
        remoteMain.enable(win.webContents)
        win.on('close', () => {
            if (isBrowserWindowAlive(win)) {
                saveDetachWindowBounds(view._plugin.name, win.getBounds())
            }
            executePluginHooks(view, 'PluginExit', null)
            removeBrowserViews(view)
            removeDetachWindows(win)
        })
        // 窗口移动/缩放时（防抖）保存位置与大小，保证进程被异常结束/直接退出时也能恢复
        let boundsSaveTimer: ReturnType<typeof setTimeout> = null
        const scheduleSaveDetachWindowBounds = () => {
            if (boundsSaveTimer) {
                clearTimeout(boundsSaveTimer)
            }
            boundsSaveTimer = setTimeout(() => {
                boundsSaveTimer = null
                if (isBrowserWindowAlive(win)) {
                    saveDetachWindowBounds(view._plugin.name, win.getBounds())
                }
            }, 300)
        }
        win.on('move', scheduleSaveDetachWindowBounds)
        win.on('resize', scheduleSaveDetachWindowBounds)
        win.on('closed', async () => {
            // @ts-ignore
            view.webContents?.destroy()
            win = undefined
            await executeHooks(AppRuntime.mainWindow, 'DetachWindowClosed', {})
        })
        win.on('focus', () => {
            if (isBrowserViewAlive(view) && isBrowserWindowAlive(win)) {
                win.webContents?.focus()
            }
        })
        DevToolsManager.register(`DetachWindow.${view._plugin.name}`, win)
        win.on('maximize', () => {
            if (!isBrowserWindowAlive(win)) {
                return
            }
            executeHooks(win, 'Maximize')
            const display = screen.getDisplayMatching(win.getBounds())
            view.setBounds({
                x: 0,
                y: WindowConfig.detachWindowTitleHeight,
                width: display.workArea.width,
                height: display.workArea.height - WindowConfig.detachWindowTitleHeight - DETACH_WINDOW_CORNER_RADIUS,
            })
        })
        win.on('unmaximize', () => {
            if (!isBrowserWindowAlive(win)) {
                return
            }
            executeHooks(win, 'Unmaximize')
            const bounds = win.getBounds()
            const display = screen.getDisplayMatching(bounds)
            const width = (display.scaleFactor * bounds.width) % 1 == 0 ? bounds.width : bounds.width - 2
            const height = (display.scaleFactor * bounds.height) % 1 == 0 ? bounds.height : bounds.height - 2
            view.setBounds({
                x: 0,
                y: WindowConfig.detachWindowTitleHeight,
                width,
                height: height - WindowConfig.detachWindowTitleHeight - DETACH_WINDOW_CORNER_RADIUS,
            })
        })
        win.webContents.once('render-process-gone', () => {
            // console.log('detach.render-process-gone')
            if (isBrowserWindowAlive(win)) {
                win.close()
            }
        })
        win.webContents.on('before-input-event', (event, input) => {
            if (input.type === 'keyDown') {
                checkForHotkey(view as any, input)
            }
        })
        if (isMac) {
            win.on('enter-full-screen', () => {
                executeHooks(win, 'EnterFullScreen')
            })
            win.on('leave-full-screen', () => {
                executeHooks(win, 'LeaveFullScreen')
            })
        }
        win.webContents.on('will-navigate', (event) => {
            event.preventDefault()
        })
        win.webContents.setWindowOpenHandler(() => {
            return { action: 'deny' }
        })
        if (option.loadUrl) {
            await option.loadUrl()
        }
        const pluginJson = JSON.parse(JSON.stringify(view._plugin))
        return new Promise((resolve, reject) => {
            win.webContents.once('dom-ready', async () => {
                if (!isBrowserViewAlive(view)) {
                    resolve(undefined)
                    return
                }
                await executeDarkMode(win, {
                    plugin,
                    isSystem: true,
                })
                view.setAutoResize({ width: true, height: true })
                win.setBrowserView(view)
                // 按窗口实际大小设置视图区域（分离窗口顶部为标题栏、底部预留圆角）
                const winBounds = win.getBounds()
                view.setBounds({
                    x: 0,
                    y: WindowConfig.detachWindowTitleHeight,
                    width: winBounds.width,
                    height: Math.max(
                        winBounds.height - WindowConfig.detachWindowTitleHeight - DETACH_WINDOW_CORNER_RADIUS,
                        0,
                    ),
                })
                DevToolsManager.autoShow(win)
                const pluginParam = {
                    alwaysOnTop,
                }
                await executeHooks(win, 'PluginInit', {
                    plugin: pluginJson,
                    state: option.pluginState,
                    param: pluginParam,
                })
                if (
                    option.option.type === 'action' ||
                    (option.option.type === 'callPage' && option.option.callPage?.option.showWindow)
                ) {
                    win.show()
                }
                resolve(undefined)
            })
            rendererLoadPath(win, 'page/detachWindow.html')
            addDetachWindows(win)
        })
    },
    async detach(option?: {}) {
        if (!mainWindowView) {
            throw 'MainViewNotFound'
        }
        const pluginState: PluginState = await executeHooks(AppRuntime.mainWindow, 'PluginState')
        AppRuntime.mainWindow.removeBrowserView(mainWindowView)
        const bounds = mainWindowView.getBounds()
        await this._showInDetachWindow(mainWindowView, {
            pluginState,
            width: bounds.width,
            height: bounds.height,
            option: {
                type: 'action',
            },
        })
        mainWindowView = null
        await executeHooks(AppRuntime.mainWindow, 'PluginDetached')
        AppRuntime.mainWindow.hide()
    },
    async toggleDetachPluginAlwaysOnTop(view: BrowserView, alwaysOnTop: boolean, option?: {}) {
        view._window.setAlwaysOnTop(alwaysOnTop)
        return alwaysOnTop
    },
    async setDetachPluginZoom(view: BrowserView, zoom: number, option?: {}) {
        view.webContents.setZoomFactor(zoom / 100)
    },
    async firePluginMoreMenuClick(view: BrowserView, name: string, option?: {}) {
        await executePluginHooks(view, 'MoreMenuClick', { name })
    },
    async fireDetachOperateClick(view: BrowserView, name: string, option?: {}) {
        await executePluginHooks(view, 'DetachOperateClick', { name })
    },
    async closeDetachPlugin(view: BrowserView, option?: {}) {
        view._window.close()
    },
    async testCallMainPluginAction(name: string, arg?: any) {
        if (!mainWindowView) {
            throw new Error('MainPluginViewNotFound')
        }
        return mainWindowView.webContents.executeJavaScript(
            `(() => {
                if (!window.__test) throw new Error('TestRegistryNotFound')
                if (!window.__test.listActions().includes(${JSON.stringify(name)})) {
                    throw new Error('TestActionNotFound: ${name}')
                }
                return window.__test.callAction(${JSON.stringify(name)}, ${JSON.stringify(arg)})
            })()`,
        )
    },
    async testCaptureMainPluginView() {
        if (!mainWindowView) {
            throw new Error('MainPluginViewNotFound')
        }
        const image = await mainWindowView.webContents.capturePage()
        return image.toPNG().toString('base64')
    },
    /**
     * 截取指定插件当前打开的窗口画面，返回 base64 PNG。
     * 查找顺序：分离窗口（detach）→ 主窗口内嵌视图（browser view）→ 当前主插件视图。
     *
     * 渲染前提：Electron 对隐藏窗口默认启用 backgroundThrottling，渲染会被暂停，
     * capturePage 只会得到初始帧（白底+logo）。因此截图前必须：
     *   1. 临时关闭 backgroundThrottling（强制持续渲染）
     *   2. 若窗口隐藏则 show + focus（触发真实绘制）
     *   3. 等待渲染帧稳定后再截
     * @param name 插件 name（如 BentoSlides）
     */
    async capture(name: string) {
        if (!name) {
            throw new Error('PluginNameRequired')
        }
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

        const snapshot = async (wc: Electron.WebContents, win?: BrowserWindow | null, wasVisible?: boolean) => {
            if (!wc || wc.isDestroyed()) {
                return null
            }
            const wasThrottled = wc.getBackgroundThrottling()
            wc.setBackgroundThrottling(false)
            let lastState: any = null
            try {
                // 隐藏窗口先显示，触发真实渲染
                if (win && isBrowserWindowAlive(win) && !win.isVisible()) {
                    win.show()
                    win.focus()
                    await sleep(500)
                }
                // 轮询页面状态：等待 readyState=complete 且 body 有实际内容
                // （隐藏窗口初帧只有白底/logo，必须等真实渲染完成）
                const deadline = Date.now() + 20000
                while (Date.now() < deadline) {
                    try {
                        const state = await wc.executeJavaScript(
                            `({readyState: document.readyState, len: (document.body ? document.body.innerText.length : 0), htmlLen: document.documentElement ? document.documentElement.innerHTML.length : 0, bentoReady: !!(window && window.bento), url: location.href, title: document.title})`,
                            true,
                        )
                        lastState = state
                        if (state && state.readyState === 'complete' && state.len > 20) {
                            break
                        }
                    } catch {
                        // 页面尚未就绪，继续等
                    }
                    await sleep(500)
                }
                // 等一帧渲染稳定
                await sleep(800)
                const image = await wc.capturePage()
                if (image && !image.isEmpty()) {
                    return { base64: image.toPNG().toString('base64'), state: lastState }
                }
                return { base64: '', state: lastState }
            } finally {
                wc.setBackgroundThrottling(wasThrottled)
                // 恢复窗口原有可见状态
                if (win && isBrowserWindowAlive(win) && !wasVisible && win.isVisible()) {
                    win.hide()
                }
            }
        }

        // 把两张 nativeImage 合成一张：shell 为底（含标题栏/红绿灯），
        // content 按 (offsetX, offsetY)（DIP）覆盖上去。
        // 返回 { base64, width, height }；失败返回 null。
        const composeImages = (
            shell: Electron.NativeImage,
            content: Electron.NativeImage,
            offsetX: number,
            offsetY: number,
        ): { base64: string; width: number; height: number } | null => {
            if (shell.isEmpty() || content.isEmpty()) {
                return null
            }
            const shellSize = shell.getSize()
            const contentSize = content.getSize()
            const outW = shellSize.width
            const outH = shellSize.height
            // 直接用 raw bitmap（BGRA）逐行拷贝，避免额外 PNG 编解码。
            // toBitmap() 返回物理像素 buffer：宽高 = DIP 尺寸 × scaleFactor。
            const scaleFactor = shell.getScaleFactors()[0] || 1
            const shellRaw = shell.toBitmap()
            const contentRaw = content.toBitmap()
            const contentW = Math.round(contentSize.width * scaleFactor)
            const contentH = Math.round(contentSize.height * scaleFactor)
            const outRaw = Buffer.from(shellRaw)
            const dstX = Math.round(offsetX * scaleFactor)
            const dstY = Math.round(offsetY * scaleFactor)
            const bytesPerRow = Math.round(outW * scaleFactor) * 4
            // 内容图底部不越过圆角预留区：BrowserView 高度已减 cornerRadius，
            // 但 capturePage 返回的 webContents 视口高度可能未随 bounds 裁剪，
            // 这里显式限制覆盖高度，避免内容盖住底部圆角。
            const maxRows = Math.round((outH - offsetY - DETACH_WINDOW_CORNER_RADIUS) * scaleFactor)
            const copyRows = Math.min(contentH, maxRows)
            for (let y = 0; y < copyRows; y++) {
                const srcRow = y * contentW * 4
                const dstRow = (dstY + y) * bytesPerRow + dstX * 4
                if (dstRow < 0 || dstRow + contentW * 4 > outRaw.length) {
                    continue
                }
                contentRaw.copy(outRaw, dstRow, srcRow, srcRow + contentW * 4)
            }
            const composed = nativeImage.createFromBitmap(outRaw, {
                width: Math.round(outW * scaleFactor),
                height: Math.round(outH * scaleFactor),
            })
            if (composed.isEmpty()) {
                return null
            }
            // 修正透明窗口圆角：desktopCapturer 系统截图会把窗口透明角落
            // （圆角外区域）渲染成不透明的近黑像素，这里把四角近黑像素的
            // alpha 置 0（透明），还原 macOS 圆角窗口的透明角落。
            const fixCornerBlack = (raw: Buffer, cornerW: number, cornerH: number) => {
                const bw = Math.round(outW * scaleFactor)
                const bh = Math.round(outH * scaleFactor)
                const rowBytes = bw * 4
                const isNearBlack = (i: number) => {
                    const b = raw[i]
                    const g = raw[i + 1]
                    const r = raw[i + 2]
                    return r < 40 && g < 40 && b < 40
                }
                const patch = (x0: number, y0: number, w: number, h: number) => {
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            const i = (y0 + y) * rowBytes + (x0 + x) * 4
                            if (isNearBlack(i)) {
                                // BGRA：alpha 是第 4 个字节
                                raw[i + 3] = 0
                            }
                        }
                    }
                }
                patch(0, 0, cornerW, cornerH) // top-left
                patch(bw - cornerW, 0, cornerW, cornerH) // top-right
                patch(0, bh - cornerH, cornerW, cornerH) // bottom-left
                patch(bw - cornerW, bh - cornerH, cornerW, cornerH) // bottom-right
            }
            const cornerPx = Math.round(DETACH_WINDOW_CORNER_RADIUS * scaleFactor) + 4
            fixCornerBlack(outRaw, cornerPx, cornerPx)
            const fixed = nativeImage.createFromBitmap(outRaw, {
                width: Math.round(outW * scaleFactor),
                height: Math.round(outH * scaleFactor),
            })
            return { base64: fixed.toPNG().toString('base64'), width: outW, height: outH }
        }

        // 系统级截取指定窗口的画面（含 macOS 红绿灯等系统 overlay）。
        // desktopCapturer 截取的是窗口的完整合成画面（系统录制 API），
        // 与 win.capturePage()（仅 webContents，不含系统 overlay）不同。
        // 需屏幕录制权限；失败时返回 null，由调用方回退。
        const captureWindowSource = async (win: BrowserWindow): Promise<Electron.NativeImage | null> => {
            try {
                const [winW, winH] = win.getSize()
                const sources = await desktopCapturer.getSources({
                    types: ['window'],
                    thumbnailSize: { width: winW, height: winH },
                    fetchWindowIcons: false,
                })
                if (!sources || sources.length === 0) {
                    return null
                }
                // 优先匹配窗口标题（detach 窗口 title = plugin.title）
                const targetTitle = win.getTitle()
                let source = sources.find((s) => s.name === targetTitle) || null
                if (!source) {
                    // 兜底：找尺寸接近的窗口源
                    source =
                        sources.find((s) => {
                            const t = s.thumbnail.getSize()
                            return Math.abs(t.width - winW) < 50 && Math.abs(t.height - winH) < 50
                        }) || null
                }
                if (!source || source.thumbnail.isEmpty()) {
                    return null
                }
                return source.thumbnail
            } catch {
                return null
            }
        }

        // 窗口级截图：截取整个 BrowserWindow（含 macOS 红绿灯标题栏），
        // 再截内嵌 BrowserView 的真实内容，按 view 在窗口内的位置合成。
        // 外壳优先用 desktopCapturer 窗口源（系统级截图，含红绿灯），
        // 失败回退 win.capturePage()（仅 webContents）。
        const snapshotWindowWithView = async (win: BrowserWindow, view: BrowserView) => {
            if (!isBrowserWindowAlive(win) || !isBrowserViewAlive(view)) {
                return null
            }
            const wasVisible = win.isVisible()
            const wc = view.webContents
            const wasThrottled = wc.getBackgroundThrottling()
            wc.setBackgroundThrottling(false)
            try {
                // 隐藏窗口先显示，触发真实渲染（desktopCapturer 也只能截可见窗口）
                if (!wasVisible) {
                    win.show()
                    win.focus()
                    await sleep(500)
                }
                // 等待插件视图渲染完成（readyState=complete 且有实际内容）
                const deadline = Date.now() + 20000
                let lastState: any = null
                while (Date.now() < deadline) {
                    try {
                        const state = await wc.executeJavaScript(
                            `({readyState: document.readyState, len: (document.body ? document.body.innerText.length : 0)})`,
                            true,
                        )
                        lastState = state
                        if (state && state.readyState === 'complete' && state.len > 20) {
                            break
                        }
                    } catch {
                        // continue waiting
                    }
                    await sleep(500)
                }
                await sleep(800)
                // 2) 内容：插件 BrowserView
                const content = await wc.capturePage()
                // 1) 外壳：优先系统级窗口截图（含红绿灯），失败回退 webContents 截图
                let shell = await captureWindowSource(win)
                let shellType = 'desktop'
                if (!shell) {
                    shell = await win.capturePage()
                    shellType = 'webContents'
                }
                // 3) 合成：view 在窗口内容区内的位置（y 从标题栏下方开始）
                const bounds = view.getBounds()
                const composed = composeImages(shell, content, bounds.x, bounds.y)
                if (composed) {
                    return { ...composed, state: lastState, shellType }
                }
                return null
            } finally {
                wc.setBackgroundThrottling(wasThrottled)
                if (!wasVisible && win.isVisible()) {
                    win.hide()
                }
            }
        }

        // 1) detach windows: capture shell (traffic-light title bar) + BrowserView content.
        for (const win of ManagerWindow.listDetachWindows()) {
            if (win._plugin?.name === name && isBrowserWindowAlive(win)) {
                const views = win.getBrowserViews()
                const view = views.find((v) => isBrowserViewAlive(v)) || null
                if (view) {
                    const shot = await snapshotWindowWithView(win, view)
                    if (shot) {
                        return { type: 'detach', ...shot }
                    }
                }
            }
        }
        // 2) browser views embedded in the main window:
        //    shell = mainWindow (search bar + traffic lights), content = BrowserView.
        for (const view of ManagerWindow.listBrowserViews()) {
            if (view._plugin?.name === name && isBrowserViewAlive(view)) {
                const win = view._window && isBrowserWindowAlive(view._window) ? view._window : null
                if (win) {
                    const shot = await snapshotWindowWithView(win, view)
                    if (shot) {
                        return { type: 'view', ...shot }
                    }
                } else {
                    const shot = await snapshot(view.webContents, null, true)
                    if (shot) {
                        return { type: 'view', ...shot }
                    }
                }
            }
        }
        // 3) the current main plugin view (same as #2 without separate loop)
        if (mainWindowView && mainWindowView._plugin?.name === name && isBrowserViewAlive(mainWindowView)) {
            const win =
                mainWindowView._window && isBrowserWindowAlive(mainWindowView._window) ? mainWindowView._window : null
            if (win) {
                const shot = await snapshotWindowWithView(win, mainWindowView)
                if (shot) {
                    return { type: 'view', ...shot }
                }
            } else {
                const shot = await snapshot(mainWindowView.webContents, null, true)
                if (shot) {
                    return { type: 'view', ...shot }
                }
            }
        }
        const liveViews = ManagerWindow.listBrowserViews()
            .filter((v) => isBrowserViewAlive(v))
            .map((v) => v._plugin?.name || '?')
        const liveDetach = ManagerWindow.listDetachWindows()
            .filter((w) => isBrowserWindowAlive(w))
            .map((w) => w._plugin?.name || '?')
        const mainName = mainWindowView && isBrowserViewAlive(mainWindowView) ? mainWindowView._plugin?.name : null
        throw new Error(
            `PluginWindowNotFound:${name} (views=[${liveViews.join(',')}] detach=[${liveDetach.join(',')}] main=${mainName})`,
        )
    },
    async testEvaluateMainPluginView(script: string) {
        if (!mainWindowView) {
            throw new Error('MainPluginViewNotFound')
        }
        return mainWindowView.webContents.executeJavaScript(script)
    },
    async openDetachPluginDevTools(view: BrowserView, option?: {}) {
        const devToolsWin = DevToolsManager.getWindow(view)
        if (devToolsWin) {
            devToolsWin.close()
        } else if (view.webContents.isDevToolsOpened()) {
            view.webContents.closeDevTools()
        } else {
            view.webContents.openDevTools({
                mode: 'detach',
                activate: true,
                title: `DetachView.${view._plugin.name}`,
            })
        }
    },
}
