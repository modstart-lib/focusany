import * as remoteMain from "@electron/remote/main";
import {BrowserView, BrowserWindow, screen, shell, WebContents} from "electron";
import {ActionRecord, PluginEnv, PluginRecord, PluginState} from "../../../../src/types/Manager";
import {WindowConfig} from "../../../config/window";
import {DevToolsManager} from "../../../lib/devtools";
import {isMac} from "../../../lib/env";
import {preloadDefault, rendererIsUrl, rendererLoadPath} from "../../../lib/env-main";
import {HotKeyUtil} from "../../../lib/util";
import {AppsMain} from "../../app/main";
import {AppEnv, AppRuntime} from "../../env";
import {Events} from "../../event/main";
import {Log} from "../../log/main";
import {executeDarkMode, executeHooks, executePluginHooks} from "../lib/hooks";
import {ManagerPlugin} from "../plugin";
import {ManagerPluginEvent} from "../plugin/event";
import {ManagerSystem} from "../system";
import {PluginContext} from "../type";
import {RemoteWebManager} from "./remoteWeb";
import {PluginLog} from "../plugin/log";

const browserViews = new Map<WebContents, BrowserView>();
const detachWindows = new Map<WebContents, BrowserWindow>();
let mainWindowView: BrowserView | null = null;

const addBrowserViews = (view: BrowserView) => {
    // console.log('addBrowserViews.value', view)
    browserViews.set(view.webContents, view);
};

const removeBrowserViews = (view: BrowserView) => {
    browserViews.delete(view.webContents);
};

const addDetachWindows = (win: BrowserWindow) => {
    detachWindows.set(win.webContents, win);
};

const removeDetachWindows = (win: BrowserWindow) => {
    detachWindows.delete(win.webContents);
};

const checkForHotkey = async (view: PluginContext, input: Electron.Input) => {
    if (view._event && view._event["Hotkey"]) {
        const hotkey = HotKeyUtil.getFromEvent(input);
        if (hotkey) {
            view._event["Hotkey"].forEach(({id, hotkeys}) => {
                if (HotKeyUtil.match(hotkeys, hotkey)) {
                    executePluginHooks(view as BrowserView, "Hotkey", {id, hotkey});
                }
            });
        }
    }
};

export const ManagerWindow = {
    listBrowserViews(): BrowserView[] {
        return Array.from(browserViews.values());
    },
    listDetachWindows(): BrowserWindow[] {
        return Array.from(detachWindows.values());
    },
    getViewByWebContents: (webContents: any) => {
        // console.log('getViewByWebContents.value', webContents)
        let view = browserViews.get(webContents);
        if (view) {
            return view;
        }
        const iterator = browserViews.entries();
        while (true) {
            const {value, done} = iterator.next();
            if (done) {
                break;
            }
            // console.log('getViewByWebContents.value.start', value[1], value[1]._window)
            if (value[1]._window.webContents === webContents) {
                return value[1];
            }
        }
        return null;
    },
    detachWindowOperate: (type: "open" | "close", action: ActionRecord) => {
        let win = null;
        for (const w of ManagerWindow.listDetachWindows()) {
            if (w.id === action.runtime.windowId) {
                win = w;
                break;
            }
        }
        if (!win) {
            throw "DetachWindowNotFound";
        }
        if (type === "open") {
            win.show();
            win.focus();
        } else {
            win.close();
        }
        AppRuntime.mainWindow.setSize(WindowConfig.mainWidth, WindowConfig.mainHeight);
        setTimeout(() => {
            AppRuntime.mainWindow.hide();
        }, 100);
    },
    async openForCode(
        plugin: PluginRecord,
        action: ActionRecord,
        option?: {
            codeData?: any;
        }
    ) {
        const {
            nodeIntegration,
            preloadBase,
            preload,
            main
        } = await ManagerPlugin.getInfo(plugin);
        // console.log('openForCode', {preload, main})
        const viewSession = await ManagerPlugin.getViewSession(plugin);
        if (preloadBase) {
            viewSession.setPreloads([preloadBase]);
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
                    standard: "system-ui",
                    serif: "system-ui",
                },
                spellcheck: false,
            },
        });
        addBrowserViews(view);
        view._plugin = plugin;
        view._window = AppRuntime.mainWindow;
        remoteMain.enable(view.webContents);
        AppRuntime.mainWindow.addBrowserView(view);
        view.webContents.loadURL(main).then();
        DevToolsManager.register(`MainCodeView.${plugin.name}`, view);
        view.webContents.on("preload-error", (event, preloadPath, error) => {
            Log.error("ManagerWindow.openForCode.preload-error", error);
        });
        return new Promise((resolve, reject) => {
            view.webContents.once("dom-ready", async () => {
                DevToolsManager.autoShow(view);
                view.setBounds({
                    x: 0,
                    y: 0,
                    width: 0, //size[0],
                    height: 0,
                });
                const evalJs = `
            (async()=>{
                const name = '${action.name}';
                if(window.exports && window.exports.code && (name in window.exports.code)) {
                    return await window.exports.code[name](${JSON.stringify(option.codeData)})
                }else{
                    throw new Error('ActionCodeNotFound : ' + name)
                }
            })();
            `;
                view.webContents
                    ?.executeJavaScript(evalJs)
                    .then(value => {
                        resolve(value);
                    })
                    .catch(e => {
                        Log.error("ManagerWindow.openForCode.evalJs.error", e);
                        reject(e);
                    })
                    .finally(() => {
                        setTimeout(() => {
                            // console.log('ManagerWindow.openForCode.evalJs.finally')
                            AppRuntime.mainWindow.removeBrowserView(view);
                            removeBrowserViews(view);
                            if (
                                view._plugin.development &&
                                view._plugin.development.env === PluginEnv.DEV &&
                                view._plugin.development.keepCodeDevTools
                            ) {
                                // 保留最后调试信息
                            } else {
                                // @ts-ignore
                                view.webContents?.destroy();
                            }
                        }, 1000);
                    });
            });
        });
    },
    async open(plugin: PluginRecord, action: ActionRecord, option?: {}) {
        const {
            nodeIntegration,
            preloadBase,
            preload,
            main,
            width,
            height,
            autoDetach,
            singleton,
            zoom
        } = await ManagerPlugin.getInfo(plugin);
        // console.log('ManagerWindow.open', {nodeIntegration, preload, main, width, height, autoDetach})
        const readyData = {};
        readyData["actionName"] = action.name;
        readyData["actionMatch"] = action.runtime?.match;
        readyData["actionMatchFiles"] = action.runtime?.matchFiles;
        readyData["requestId"] = action.runtime?.requestId;
        readyData["reenter"] = false;
        readyData["isView"] = false;
        if (singleton) {
            for (const v of this.listBrowserViews()) {
                if (v._plugin.name === plugin.name) {
                    v._window.show();
                    v._window.focus();
                    await executeHooks(AppRuntime.mainWindow, "PluginAlreadyOpened", {});
                    readyData["reenter"] = true;
                    await executePluginHooks(v, "PluginReady", readyData);
                    return;
                }
            }
        }
        const viewSession = await ManagerPlugin.getViewSession(plugin);
        if (preloadBase) {
            viewSession.setPreloads([preloadBase]);
        }
        if (plugin.setting.remoteWebCacheEnable) {
            await RemoteWebManager.create(plugin);
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
                    standard: "system-ui",
                    serif: "system-ui",
                },
                spellcheck: false,
            },
        });
        addBrowserViews(view);
        view._plugin = plugin;
        remoteMain.enable(view.webContents);
        DevToolsManager.register(`PluginView.${plugin.name}`, view);
        view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            PluginLog.error(plugin.name, 'Load.Error-did-fail-load', {
                errorCode,
                errorDescription,
                validatedURL,
            });
        })
        view.webContents.on('did-fail-provisional-load', (event, errorCode, errorDescription, validatedURL) => {
            PluginLog.error(plugin.name, 'Load.Error-did-fail-provisional-load', {
                errorCode,
                errorDescription,
                validatedURL,
            });
        })
        view.webContents.on("preload-error", (event, preloadPath, error) => {
            PluginLog.error(plugin.name, 'Load.Error-preload-error', {
                error: error + "",
                preloadPath,
            })
        });
        view.webContents.on('render-process-gone', () => {
            PluginLog.error(plugin.name, 'Load.Error-render-process-gone', {
                error: 'render-process-gone',
            });
        });
        view.webContents.once("did-finish-load", async () => {
            await executeDarkMode(view, {
                plugin,
                isSystem: ManagerSystem.match(plugin.name),
            });
            Events.sendRaw(view.webContents, "APP_READY", {
                name: plugin.name,
                AppEnv,
            });
        });
        view.webContents.once("did-frame-finish-load", () => {
            // console.log('setZoomFactor', zoom / 100)
            setTimeout(() => {
                view.webContents.setZoomFactor(zoom / 100);
            }, 0);
        });
        view.webContents.setWindowOpenHandler(({url}) => {
            if (url.startsWith("https://") || url.startsWith("http://")) {
                shell.openExternal(url);
            }
            return {action: "deny"};
        });
        view.setAutoResize({width: true, height: true});
        // console.log('ManagerWindow.open', {nodeIntegration, preload, main, width, height, autoDetach})
        view.webContents.once("dom-ready", async () => {
            DevToolsManager.autoShow(view);
        });
        view.webContents.on("before-input-event", (event, input) => {
            // console.log('Load.Error-before-input-event', input)
            if (input.type === "keyUp") {
                // exit when Escape key is pressed
                if (mainWindowView === view) {
                    if (input.key === "Escape") {
                        if (!(input.meta || input.control || input.shift || input.alt)) {
                            if (mainWindowView) {
                                ManagerWindow.close();
                                AppRuntime.mainWindow.webContents.focus();
                            }
                        }
                    }
                } else {
                    if (input.key === "Escape") {
                        if (!(input.meta || input.control || input.shift || input.alt)) {
                            view._window.isFullScreen() && view._window.setFullScreen(false);
                        }
                    }
                }
            } else if (input.type === "keyDown") {
                checkForHotkey(view as any, input);
            }
        });
        const windowOption = {
            width,
            height,
            pluginState: {
                value: "",
                placeholder: "",
            },
            loadUrl: async () => {
                try {
                    if (rendererIsUrl(main)) {
                        await view.webContents.loadURL(main)
                    } else {
                        await view.webContents.loadFile(main)
                    }
                } catch (e) {
                    view.webContents.loadURL("about:blank").then();
                    PluginLog.error(plugin.name, 'Load.Error-loadUrl', {
                        error: e + "",
                        main,
                    });
                }
            },
        };
        setTimeout(async () => {
            if (autoDetach) {
                if (!mainWindowView) {
                    AppRuntime.mainWindow.hide();
                }
            }
            if (autoDetach) {
                await this._showInDetachWindow(view, windowOption);
            } else {
                await this._showInMainWindow(view, windowOption);
            }
            // Log.info('open.PluginReady', JSON.stringify({readyData, action}))
            await executePluginHooks(view, "PluginReady", readyData);
        }, 0);
    },
    async subInputChange(win: BrowserWindow, keywords: string) {
        const view = win.getBrowserView();
        await executePluginHooks(view, "SubInputChange", keywords);
    },
    async close(
        plugin?: PluginRecord,
        option?: {
            window?: BrowserWindow;
            openForNext?: boolean;
        }
    ) {
        option = Object.assign(
            {
                openForNext: false,
            },
            option
        );
        if (mainWindowView && (!plugin || mainWindowView._plugin.name === plugin.name)) {
            await executePluginHooks(mainWindowView, "PluginExit", null).then();
            await executeHooks(AppRuntime.mainWindow, "PluginExit", {
                openForNext: option.openForNext,
            }).then();
            removeBrowserViews(mainWindowView);
            AppRuntime.mainWindow.removeBrowserView(mainWindowView);
            // @ts-ignore
            mainWindowView.webContents?.destroy();
            mainWindowView = null;
        } else {
            // detach的插件窗口
            if (option.window) {
                option.window.close();
            } else {
                Log.error("ManagerWindow.close", "windowNotFound");
            }
        }
    },
    async openMainPluginDevTools(option?: {}) {
        const devToolsWin = DevToolsManager.getWindow(mainWindowView)
        if (devToolsWin) {
            devToolsWin.close()
        } else if (mainWindowView.webContents.isDevToolsOpened()) {
            mainWindowView.webContents.closeDevTools();
        } else {
            mainWindowView.webContents.openDevTools({
                mode: "detach",
                activate: true,
                title: `MainPluginView`,
            });
        }
    },
    async _showInMainWindow(
        view: BrowserView,
        option: {
            loadUrl: () => void;
            pluginState: PluginState;
            width: number;
            height: number;
        }
    ) {
        if (!(await ManagerPluginEvent.isMainWindowShown(null, null))) {
            await ManagerPluginEvent.showMainWindow(null, null);
        }
        // console.log('showInMainWindow', view._plugin.name, option)
        if (mainWindowView) {
            await this.close(mainWindowView._plugin, {
                openForNext: true,
            });
            mainWindowView = null;
        }
        view._window = AppRuntime.mainWindow;
        mainWindowView = view;
        AppRuntime.mainWindow.addBrowserView(view);
        AppRuntime.mainWindow.setSize(option.width, WindowConfig.mainHeight + option.height);
        const pluginParam = {};
        const pluginState: PluginState = {
            value: "",
            placeholder: "",
            isVisible: false,
        };
        const pluginInitReadyParam = {
            plugin: view._plugin,
            state: pluginState,
            param: pluginParam,
        };
        await executeHooks(view._window, "PluginInit", pluginInitReadyParam);
        view.webContents.once("dom-ready", async () => {
            await executeHooks(view._window, "PluginInitReady", pluginInitReadyParam);
            view.setBounds({
                x: 0,
                y: WindowConfig.mainHeight,
                width: option.width,
                height: option.height,
            });
            AppRuntime.mainWindow.focus();
        });
        option.loadUrl();
    },
    async _showInDetachWindow(
        view: BrowserView,
        option: {
            loadUrl: () => void;
            pluginState: PluginState;
            width: number;
            height: number;
        }
    ) {
        const plugin = view._plugin;
        let alwaysOnTop = false;
        if (plugin.setting?.detachAlwaysOnTop) {
            alwaysOnTop = true;
        }
        const {x, y} = AppsMain.calcPositionInCurrentDisplay(
            plugin.setting?.detachPosition || "center",
            option.width,
            option.height + WindowConfig.detachWindowTitleHeight
        );
        let win = new BrowserWindow({
            height: option.height + WindowConfig.detachWindowTitleHeight,
            width: option.width,
            autoHideMenuBar: true,
            titleBarStyle: "hidden",
            trafficLightPosition: {x: 10, y: 11},
            title: plugin.title,
            resizable: true,
            frame: false,
            show: false,
            transparent: false,
            enableLargerThanScreen: true,
            backgroundColor: "#fff",
            alwaysOnTop,
            x,
            y,
            center: true,
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
        });
        win._name = `DetachWindow.${view._plugin.name}`;
        win._plugin = view._plugin;
        view._window = win;
        remoteMain.enable(win.webContents);
        win.on("close", () => {
            executePluginHooks(view, "PluginExit", null);
            removeBrowserViews(view);
            removeDetachWindows(win);
        });
        win.on("closed", async () => {
            // @ts-ignore
            view.webContents?.destroy();
            win = undefined;
            await executeHooks(AppRuntime.mainWindow, "DetachWindowClosed", {});
        });
        win.on("focus", () => {
            view && win.webContents?.focus();
        });
        DevToolsManager.register(`DetachWindow.${view._plugin.name}`, win);
        win.on("maximize", () => {
            executeHooks(win, "Maximize");
            const display = screen.getDisplayMatching(win.getBounds());
            view.setBounds({
                x: 0,
                y: WindowConfig.detachWindowTitleHeight,
                width: display.workArea.width,
                height: display.workArea.height - WindowConfig.detachWindowTitleHeight,
            });
        });
        win.on("unmaximize", () => {
            executeHooks(win, "Unmaximize");
            const bounds = win.getBounds();
            const display = screen.getDisplayMatching(bounds);
            const width = (display.scaleFactor * bounds.width) % 1 == 0 ? bounds.width : bounds.width - 2;
            const height = (display.scaleFactor * bounds.height) % 1 == 0 ? bounds.height : bounds.height - 2;
            view.setBounds({
                x: 0,
                y: WindowConfig.detachWindowTitleHeight,
                width,
                height: height - WindowConfig.detachWindowTitleHeight,
            });
        });
        win.webContents.once("render-process-gone", () => {
            // console.log('detach.render-process-gone')
            win.close();
        });
        win.webContents.on("before-input-event", (event, input) => {
            if (input.type === "keyDown") {
                checkForHotkey(view as any, input);
            }
        });
        if (isMac) {
            win.on("enter-full-screen", () => {
                executeHooks(win, "EnterFullScreen");
            });
            win.on("leave-full-screen", () => {
                executeHooks(win, "LeaveFullScreen");
            });
        }
        win.webContents.on("will-navigate", event => {
            event.preventDefault();
        });
        win.webContents.setWindowOpenHandler(() => {
            return {action: "deny"};
        });
        if (option.loadUrl) {
            option.loadUrl();
        }
        const pluginJson = JSON.parse(JSON.stringify(view._plugin));
        return new Promise((resolve, reject) => {
            win.webContents.once("did-finish-load", async () => {
                await executeDarkMode(win, {
                    plugin,
                    isSystem: true,
                });
                view.setAutoResize({width: true, height: true});
                win.setBrowserView(view);
                view.setBounds({
                    x: 0,
                    y: WindowConfig.detachWindowTitleHeight,
                    width: option.width,
                    height: option.height,
                });
                DevToolsManager.autoShow(win);
                const pluginParam = {
                    alwaysOnTop,
                };
                await executeHooks(win, "PluginInit", {
                    plugin: pluginJson,
                    state: option.pluginState,
                    param: pluginParam,
                });
                win.show();
                resolve(undefined);
            });
            rendererLoadPath(win, "page/detachWindow.html");
            addDetachWindows(win);
        });
    },
    async detach(option?: {}) {
        if (!mainWindowView) {
            throw "MainViewNotFound";
        }
        const pluginState: PluginState = await executeHooks(AppRuntime.mainWindow, "PluginState");
        AppRuntime.mainWindow.removeBrowserView(mainWindowView);
        const bounds = mainWindowView.getBounds();
        await this._showInDetachWindow(mainWindowView, {
            pluginState,
            width: bounds.width,
            height: bounds.height,
        });
        mainWindowView = null;
        await executeHooks(AppRuntime.mainWindow, "PluginDetached");
        AppRuntime.mainWindow.hide();
    },
    async toggleDetachPluginAlwaysOnTop(view: BrowserView, alwaysOnTop: boolean, option?: {}) {
        view._window.setAlwaysOnTop(alwaysOnTop);
        return alwaysOnTop;
    },
    async setDetachPluginZoom(view: BrowserView, zoom: number, option?: {}) {
        view.webContents.setZoomFactor(zoom / 100);
    },
    async firePluginMoreMenuClick(view: BrowserView, name: string, option?: {}) {
        await executePluginHooks(view, "MoreMenuClick", {name});
    },
    async fireDetachOperateClick(view: BrowserView, name: string, option?: {}) {
        await executePluginHooks(view, "DetachOperateClick", {name});
    },
    async closeDetachPlugin(view: BrowserView, option?: {}) {
        view._window.close();
    },
    async openDetachPluginDevTools(view: BrowserView, option?: {}) {
        const devToolsWin = DevToolsManager.getWindow(view);
        if (devToolsWin) {
            devToolsWin.close();
        } else if (view.webContents.isDevToolsOpened()) {
            view.webContents.closeDevTools();
        } else {
            view.webContents.openDevTools({
                mode: "detach",
                activate: true,
                title: `DetachView.${view._plugin.name}`,
            });
        }
    },
};
