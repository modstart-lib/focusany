import {AppRuntime} from "../../env";
import {app, BrowserView, BrowserWindow, clipboard, dialog, nativeImage, Notification, screen, shell} from "electron";
import {WindowConfig} from "../../../config/window";
import {ManagerWindow} from "../window";
import {DBError} from "../../kvdb/types";
import {screenCapture} from "./screenCapture";
import {executeHooks, executePluginHooks} from "../lib/hooks";
import {AppPosition} from "../../app/lib/position";
import {Log} from "../../log/main";
import {AppsMain} from "../../app/main";
import {CommonConfig} from "../../../config/common";
import {KVDBMain} from "../../kvdb/main";
import {ManagerConfig} from "../config/config";
import {PluginContext} from "../type";
import {Manager} from "../manager";
import {ManagerPlugin} from "./index";
import {isLinux, isMac, isWin, platformArch, platformName, platformUUID} from "../../../lib/env";
import {EncodeUtil} from "../../../lib/util";
import {getClipboardFiles, setClipboardFiles} from "../clipboard/clipboardFiles";
import {ManagerHotkeySimulate} from "../hotkey/simulate";
import {ManagerClipboard} from "../clipboard";
import {ManagerAutomation} from "../automation";
import {AppConfig} from "../../../../src/config";
import {ManagerPluginPermission} from "./permission";

const getHeadHeight = (win: BrowserWindow) => {
    if (win === AppRuntime.mainWindow) {
        return WindowConfig.minHeight
    } else {
        return WindowConfig.detachWindowTitleHeight
    }
}

export const ManagerPluginEvent = {
    pluginEvents: {} as {
        [event: string]: PluginContext[]
    },
    firePluginEvent: async (event: string, data: any) => {
        if (event in ManagerPluginEvent.pluginEvents) {
            for (const context of ManagerPluginEvent.pluginEvents[event]) {
                await executePluginHooks(context as BrowserView, 'PluginEvent', {event, data});
            }
        }
    },
    registerPluginEvent: async (context: PluginContext, data: any) => {
        // console.log('registerPluginEvent', context._plugin)
        const {event} = data;
        if (!(event in ManagerPluginEvent.pluginEvents)) {
            ManagerPluginEvent.pluginEvents[event] = []
        }
        if (!ManagerPluginPermission.check(context._plugin, 'event', event)) {
            AppsMain.toast(`插件没有权限(Event.${event})`, {status: 'error'})
            return
        }
        ManagerPluginEvent.pluginEvents[event].push(context)
        for (const e in ManagerPluginEvent.pluginEvents) {
            ManagerPluginEvent.pluginEvents[e] = ManagerPluginEvent.pluginEvents[e].filter(c => {
                return !!(c as BrowserView).webContents
            })
            if (ManagerPluginEvent.pluginEvents[e].length === 0) {
                delete ManagerPluginEvent.pluginEvents[e]
            }
        }
    },
    isMacOs: async (context: PluginContext, data: any) => {
        return isMac
    },
    isWindows: async (context: PluginContext, data: any) => {
        return isWin
    },
    isLinux: async (context: PluginContext, data: any) => {
        return isLinux
    },
    getPlatformArch: async (context: PluginContext, data: any) => {
        return platformArch()
    },
    isMainWindowShown: async (context: PluginContext, data: any) => {
        const win = AppRuntime.mainWindow
        return win.isVisible() && win.isFocused();
    },
    hideMainWindow: async (context: PluginContext, data: any) => {
        AppRuntime.mainWindow.hide();
    },
    showMainWindow: async (context: PluginContext, data: any) => {
        Manager.selectedContent = null
        // Manager.selectedContent = await ManagerClipboard.getSelectedContent()
        Manager.activeWindow = await ManagerAutomation.getActiveWindow()
        const {x: wx, y: wy} = AppPosition.get('main', (screenX, screenY, screenWidth, screenHeight) => {
            // console.log('calculator', {screenX, screenY, screenWidth, screenHeight});
            return {
                x: screenX + screenWidth / 2 - WindowConfig.mainWidth / 2,
                y: screenY + screenHeight / 8,
            }
        })
        const win = AppRuntime.mainWindow
        win.setAlwaysOnTop(false);
        win.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true});
        win.focus();
        win.setVisibleOnAllWorkspaces(false, {
            visibleOnFullScreen: true,
        });
        win.setPosition(wx, wy);
        win.show();
    },
    isFastPanelWindowShown: async (context: PluginContext, data: any) => {
        const win = AppRuntime.fastPanelWindow
        return win.isVisible() && win.isFocused();
    },
    showFastPanelWindow: async (context: PluginContext, data: any) => {
        Manager.selectedContent = await ManagerClipboard.getSelectedContent()
        Manager.activeWindow = await ManagerAutomation.getActiveWindow()
        const win = AppRuntime.fastPanelWindow
        const {x, y} = AppPosition.getContextMenuPosition(WindowConfig.fastPanelWidth, WindowConfig.fastPanelHeight);
        win.setAlwaysOnTop(false);
        win.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true});
        win.focus();
        win.setVisibleOnAllWorkspaces(false, {
            visibleOnFullScreen: true,
        });
        win.setPosition(x, y);
        win.show();
    },
    hideFastPanelWindow: async (context: PluginContext, data: any) => {
        const win = AppRuntime.fastPanelWindow
        win.hide();
    },
    showOpenDialog: async (context: PluginContext, data: any) => {
        return dialog.showOpenDialogSync(context._window, data);
    },
    showSaveDialog: async (context: PluginContext, data: any) => {
        return dialog.showSaveDialogSync(context._window, data);
    },
    setExpendHeight: async (context: PluginContext, data: any) => {
        const targetHeight = data as number;
        const win = context._window
        win.setSize(win.getSize()[0], targetHeight);
        const screenPoint = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint(screenPoint);
        const position = win.getPosition()[1] + targetHeight > display.bounds.height
            ? targetHeight - getHeadHeight(win) : 0;
        // originWindow.webContents.executeJavaScript(
        //     `window.setPosition && typeof window.setPosition === "function" && window.setPosition(${position})`
        // );
    },
    setSubInput: async (context: PluginContext, data: any) => {
        const win = context._window;
        const payload = {
            placeholder: data.placeholder,
            isFocus: data.isFocus,
            isVisible: data.isVisible,
        };
        if (data.isFocus) {
            win.webContents.focus();
        }
        await executeHooks(win, 'SetSubInput', payload);
    },
    removeSubInput: async (context: PluginContext, data: any) => {
        await executeHooks(context._window, 'RemoveSubInput');
    },
    setSubInputValue: async (context: PluginContext, data: any) => {
        const {text} = data;
        await executeHooks(context._window, 'SetSubInputValue', text);
        // this.sendSubInputChangeEvent({ data });
    },
    subInputBlur: async (context: PluginContext, data: any) => {
        (context as BrowserView).webContents.focus()
    },
    getPluginRoot: async (context: PluginContext, data: any) => {
        if (context._plugin.runtime && context._plugin.runtime.root) {
            return context._plugin.runtime.root;
        }
        return null
    },
    getPluginConfig: async (context: PluginContext, data: any) => {
        if (context._plugin) {
            return context._plugin;
        }
        return null;
    },
    getPluginInfo: async (context: PluginContext, data: any) => {
        if (context._plugin) {
            return ManagerPlugin.getInfo(context._plugin)
        }
        return null;
    },
    getPluginEnv: async (context: PluginContext, data: any) => {
        if (context._plugin) {
            if (context._plugin.env && context._plugin.env.env) {
                return context._plugin.env.env
            }
        }
        return 'prod'
    },
    getQuery: async (context: PluginContext, data: any): Promise<SearchQuery> => {
        const {requestId} = data;
        return Manager.getSearchRequestQuery(requestId) || {
            keywords: '',
            currentFiles: [],
            currentImage: '',
            currentText: '',
            selectedContent: null
        }
    },
    getPath: async (context: PluginContext, data: any) => {
        return app.getPath(data.name);
    },
    showToast: async (context: PluginContext, data: any) => {
        let {body, options} = data;
        options = Object.assign({
            duration: 0,
            status: 'success',
        }, options)
        AppsMain.toast(body, options)
    },
    showNotification: async (context: PluginContext, data: any) => {
        let {body, clickActionName} = data;
        if (!Notification.isSupported()) {
            Log.error('ManagerEvent.showNotification.Notification is not supported');
            return;
        }
        if ('string' != typeof body) {
            body = String(body)
        }
        const plugin = context._plugin
        let icon = plugin.logo;
        if (icon && icon.startsWith('file://')) {
            icon = icon.substring(7);
        }
        const notify = new Notification({
            title: plugin ? plugin.title : null,
            body,
            icon,
        });
        notify.show();
    },
    showMessageBox: async (context: PluginContext, data: any) => {
        const {title, message, yes, no} = data;
        const buttons = []
        if (yes) {
            buttons.push(yes)
        }
        if (no) {
            buttons.push(no)
        }
        const result = await dialog.showMessageBox({
            type: 'info',
            title: title || '提示',
            message: message,
            buttons: buttons,
            defaultId: 0,
            cancelId: 1,
        });
        if (result.response === 0) {
            return true;
        }
        return false;
    },
    copyImage: async (context: PluginContext, data: any) => {
        const {image} = data;
        let imageData;
        if (image.startsWith('data:image/')) {
            imageData = nativeImage.createFromDataURL(image);
        } else {
            imageData = nativeImage.createFromPath(image);
        }
        clipboard.writeImage(imageData);
    },
    copyText: async (context: PluginContext, data: any) => {
        clipboard.writeText(String(data.text));
    },
    copyFile: async (context: PluginContext, data: any) => {
        let {file} = data;
        if (file) {
            if (!Array.isArray(file)) {
                file = [file]
            }
            setClipboardFiles(file)
            return true;
        }
        return false;
    },
    getClipboardText: async (context: PluginContext, data: any) => {
        return AppsMain.getClipboardText()
    },
    getClipboardImage: async (context: PluginContext, data: any) => {
        return AppsMain.getClipboardImage()
    },
    getClipboardFiles: async (context: PluginContext, data: any) => {
        return getClipboardFiles()
    },
    shellBeep: async (context: PluginContext, data: any) => {
        shell.beep()
    },
    getFileIcon: async (context: PluginContext, data: any) => {
        const nativeImage = await app.getFileIcon(data.path, {
            size: 'normal',
        });
        return nativeImage.toDataURL();
    },
    shellShowItemInFolder: async (context: PluginContext, data: any) => {
        shell.showItemInFolder(data.path);
    },
    simulateKeyboardTap: async (context: PluginContext, data: any) => {
        const {key, modifiers} = data;
        // 'ctrl' | 'shift' | 'command' | 'option' | 'alt'
        const modifiersNumber = modifiers.map(m => {
            switch (m) {
                case 'ctrl':
                    return ManagerHotkeySimulate.toCode('Ctrl')
                case 'shift':
                    return ManagerHotkeySimulate.toCode('Shift')
                case 'command':
                    return ManagerHotkeySimulate.toCode('Meta')
                case 'option':
                case 'alt':
                    return ManagerHotkeySimulate.toCode('Alt')
            }
        })
        ManagerHotkeySimulate.keyTap(ManagerHotkeySimulate.toCode(key), modifiersNumber)
    },
    screenCapture: async (context: PluginContext, data: any) => {
        screenCapture((image: string) => {
            if (context['_screenCaptureCallback']) {
                context['_screenCaptureCallback']({image})
            } else {
                executePluginHooks(context as BrowserView, 'ScreenCapture', {
                    image: image
                });
            }
        })
    },
    getNativeId: async (context: PluginContext, data: any) => {
        return [
            platformName(),
            EncodeUtil.md5(platformUUID())
        ].join('_')
    },
    getAppVersion: async (context: PluginContext, data: any) => {
        return AppConfig.version
    },
    outPlugin: async (context: PluginContext, data: any) => {
        await ManagerWindow.close(context._plugin);
    },
    isDarkColors: async (context: PluginContext, data: any) => {
        return await AppsMain.shouldDarkMode()
    },
    redirect: async (context: PluginContext, data: any) => {
        let {keywordsOrAction, query} = data;
        query = Object.assign({
            keywords: '',
            currentFiles: [],
            currentImage: '',
            currentText: '',
        }, query)
        // console.log('redirect', {keywordsOrAction, query})
        const action = await Manager.searchOneAction(keywordsOrAction, query)
        if (!action) {
            return false
        }
        await Manager.openAction(action)
    },
    getActions: async (context: PluginContext, data: any) => {
        let {names} = data;
        names = names || []
        const customActions = await ManagerConfig.getCustomAction()
        const plugin = context._plugin
        if (!(plugin.name in customActions)) {
            return []
        }
        return customActions[plugin.name]
            .filter(m => {
                if (names.length > 0) {
                    return names.includes(m.name)
                }
                return true
            })
            .map(m => {
                return m
            })
    },
    setAction: async (context: PluginContext, data: any) => {
        const {action} = data;
        const plugin = context._plugin
        await ManagerConfig.addCustomAction(plugin, action)
        return true
    },
    removeAction: async (context: PluginContext, data: any) => {
        const {name} = data;
        const plugin = context._plugin
        await ManagerConfig.removeCustomAction(plugin, name)
        return true
    },


    // db
    dbPut: async (context: PluginContext, data: any) => {
        return await KVDBMain.put(context._plugin.name, data.doc);
    },
    dbGet: async (context: PluginContext, data: any) => {
        // const plugin = ManagerWindow.getPluginByWindow(win);
        return await KVDBMain.get(context._plugin.name, data.id);
    },
    dbRemove: async (context: PluginContext, data: any) => {
        // const plugin = ManagerWindow.getPluginByWindow(win);
        return await KVDBMain.remove(context._plugin.name, data.doc);
    },
    dbBulkDocs: async (context: PluginContext, data: any) => {
        // const plugin = ManagerWindow.getPluginByWindow(win);
        return await KVDBMain.bulkDocs(context._plugin.name, data.docs);
    },
    dbAllDocs: async (context: PluginContext, data: any) => {
        // const plugin = ManagerWindow.getPluginByWindow(win);
        return await KVDBMain.allDocs(context._plugin.name, data.key);
    },
    dbPostAttachment: async (context: PluginContext, data: any) => {
        // const plugin = ManagerWindow.getPluginByWindow(win);
        return await KVDBMain.postAttachment(context._plugin.name, data.docId, data.attachment, data.type);
    },
    dbGetAttachment: async (context: PluginContext, data: any) => {
        // const plugin = ManagerWindow.getPluginByWindow(win);
        return await KVDBMain.getAttachment(context._plugin.name, data.docId);
    },
    dbGetAttachmentType: async (context: PluginContext, data: any) => {
        // const plugin = ManagerWindow.getPluginByWindow(win);
        return await KVDBMain.getAttachmentType(context._plugin.name, data.docId);
    },

    // dbStorage
    dbStorageSetItem: async (context: PluginContext, data: any) => {
        // const plugin = ManagerWindow.getPluginByWindow(win);
        const plugin = context._plugin
        const {key, value} = data;
        const id = `${CommonConfig.dbPluginStorageIdPrefix}/${key}`;
        const doc = {_id: id, data: value, _rev: undefined};
        const result = await KVDBMain.get(plugin.name, id);
        if (result) {
            doc._rev = result._rev;
        }
        const res = await KVDBMain.put(plugin.name, doc);
        if ((res as DBError).error) throw new Error((res as DBError).message);
    },
    dbStorageGetItem: async (context: PluginContext, data: any) => {
        const plugin = context._plugin
        const {key} = data;
        const id = `${CommonConfig.dbPluginStorageIdPrefix}/${key}`;
        const result = await KVDBMain.get(plugin.name, id);
        return result ? result.data : null;
    },
    dbStorageRemoveItem: async (context: PluginContext, data: any) => {
        const plugin = context._plugin
        const {key} = data;
        const id = `${CommonConfig.dbPluginStorageIdPrefix}/${key}`;
        const result = await KVDBMain.get(plugin.name, id);
        if (!result) return;
        await KVDBMain.remove(plugin.name, result);
    },
    detachSetTitle: async (context: PluginContext, data: any) => {
        const {title} = data;
        await executeHooks(context._window, 'DetachSet', {
            title
        })
    },
    detachSetPosition: async (context: PluginContext, data: any) => {
        const {position} = data;
        const win = context._window
        const winSize = win.getSize();
        const {x, y} = AppsMain.calcPositionInCurrentDisplay(position, winSize[0], winSize[1]);
        win.setPosition(x, y);
    },
    detachSetAlwaysOnTop: async (context: PluginContext, data: any) => {
        const {alwaysOnTop} = data;
        const win = context._window
        win.setAlwaysOnTop(alwaysOnTop);
        await executeHooks(context._window, 'DetachSet', {
            alwaysOnTop
        })
    },
    detachSetSize: async (context: PluginContext, data: any) => {
        const {width, height} = data;
        const win = context._window
        win.setSize(width, height);
    }
}
