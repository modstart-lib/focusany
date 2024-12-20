import {icnsLogoPath, icoLogoPath, logoPath} from "../config/icon";
import {AppRuntime} from "../mapi/env";
import {AppConfig} from "../../src/config";
import {isPackaged} from "../lib/env";
import {WindowConfig} from "../config/window";
import {preloadDefault, RENDERER_DIST, rendererLoadPath, VITE_DEV_SERVER_URL} from "../lib/env-main";
import * as remoteMain from "@electron/remote/main";
import {Page} from "../page";
import {BrowserWindow} from "electron";
import path from "node:path";
import {executeHooks} from "../mapi/manager/lib/hooks";
import {DevToolsManager} from "../lib/devtools";
import ConfigMain from "../mapi/config/main";

export const FastPanelMain = {
    init() {
        const fastPanelHtml = path.join(RENDERER_DIST, 'page/fastPanel.html')
        let icon = logoPath
        if (process.platform === 'win32') {
            icon = icoLogoPath
        } else if (process.platform === 'darwin') {
            icon = icnsLogoPath
        }
        AppRuntime.fastPanelWindow = new BrowserWindow({
            show: false,
            title: AppConfig.name,
            ...(!isPackaged ? {icon} : {}),
            frame: false,
            transparent: false,
            hasShadow: true,
            center: true,
            useContentSize: true,
            minWidth: WindowConfig.fastPanelWidth,
            minHeight: WindowConfig.fastPanelHeight,
            width: WindowConfig.fastPanelWidth,
            height: WindowConfig.fastPanelHeight,
            skipTaskbar: true,
            resizable: false,
            maximizable: false,
            backgroundColor: '#f1f5f9',
            alwaysOnTop: true,
            webPreferences: {
                preload: preloadDefault,
                // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
                nodeIntegration: true,
                contextIsolation: false,
                sandbox: false,
                webSecurity: false,
                webviewTag: true,
            },
        })

        AppRuntime.fastPanelWindow.on('closed', () => {
            AppRuntime.fastPanelWindow = null
        })
        AppRuntime.fastPanelWindow.on('show', async () => {
            await executeHooks(AppRuntime.fastPanelWindow, 'Show')
        });
        AppRuntime.fastPanelWindow.on('hide', async () => {
            await executeHooks(AppRuntime.fastPanelWindow, 'Hide')
        });
        AppRuntime.fastPanelWindow.on('blur', async () => {
            const fastPanelAutoHide = await ConfigMain.getEnv('fastPanelAutoHide', true)
            if (fastPanelAutoHide) {
                AppRuntime.fastPanelWindow.hide()
            }
        })

        rendererLoadPath(AppRuntime.fastPanelWindow, 'page/fastPanel.html')

        remoteMain.enable(AppRuntime.fastPanelWindow.webContents)

        AppRuntime.fastPanelWindow.webContents.on('did-finish-load', () => {
            Page.ready('fastPanel')
            DevToolsManager.autoShow(AppRuntime.fastPanelWindow)
        })
        DevToolsManager.register('FastPanel', AppRuntime.fastPanelWindow)
        // AppRuntime.fastPanelWindow.webContents.setWindowOpenHandler(({url}) => {
        //     if (url.startsWith('https:')) shell.openExternal(url)
        //     return {action: 'deny'}
        // })
    },
}
