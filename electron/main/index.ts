import {app, BrowserWindow, desktopCapturer, session, shell, protocol} from 'electron'
import {optimizer} from '@electron-toolkit/utils'

/** process.js 必须位于非依赖项的顶部 */
import {isDummy} from "../lib/process";
import * as remoteMain from '@electron/remote/main';

import {AppEnv, AppRuntime} from "../mapi/env";
import {MAPI} from '../mapi/main';

import {WindowConfig} from "../config/window";
import {AppConfig} from "../../src/config";
import Log from "../mapi/log/main";
import {ConfigMenu} from "../config/menu";
import {ConfigLang} from "../config/lang";
import {ConfigContextMenu} from "../config/contextMenu";
import {preloadDefault, rendererLoadPath} from "../lib/env-main";
import {Page} from "../page";
import {ConfigTray} from "../config/tray";
import {icnsLogoPath, icoLogoPath, logoPath} from "../config/icon";
import {isMac, isPackaged} from "../lib/env";
import {FastPanelMain} from "./fastPanel";
import {executeHooks} from "../mapi/manager/lib/hooks";
import {AppPosition} from "../mapi/app/lib/position";
import {DevToolsManager} from "../lib/devtools";
import {AppsMain} from "../mapi/app/main";
import {ManagerEditor} from "../mapi/manager/editor";
import {ProtocolMain} from "../mapi/protocol/main";

const isDummyNew = isDummy

if (process.env['ELECTRON_ENV_PROD']) {
    DevToolsManager.setEnable(false)
}

process.on('uncaughtException', (error) => {
    Log.error('UncaughtException', error);
});

process.on('unhandledRejection', (reason) => {
    Log.error('UnhandledRejection', reason);
});

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
}

app.disableHardwareAcceleration()
// app.setAccessibilitySupportEnabled(true)

AppEnv.appRoot = process.env.APP_ROOT
AppEnv.appData = app.getPath('appData')
AppEnv.userData = app.getPath('userData')
AppEnv.isInit = true

MAPI.init()
ConfigContextMenu.init()

Log.info('Starting')
Log.info('LaunchInfo', {
    isPackaged,
    appRoot: AppEnv.appRoot,
    appData: AppEnv.appData,
    userData: AppEnv.userData,
})

async function createWindow() {
    let icon = logoPath
    if (process.platform === 'win32') {
        icon = icoLogoPath
    } else if (process.platform === 'darwin') {
        icon = icnsLogoPath
    }
    const {x: wx, y: wy} = AppPosition.get('main', (screenX, screenY, screenWidth, screenHeight) => {
        // console.log('calculator', {screenX, screenY, screenWidth, screenHeight});
        return {
            x: screenX + screenWidth / 2 - WindowConfig.mainWidth / 2,
            y: screenY + screenHeight / 8,
        }
    })
    AppRuntime.mainWindow = new BrowserWindow({
        show: true,
        title: AppConfig.name,
        ...(!isPackaged ? {icon} : {}),
        frame: false,
        transparent: false,
        hasShadow: true,
        // center: true,
        x: wx,
        y: wy,
        useContentSize: true,
        minWidth: WindowConfig.mainWidth,
        minHeight: WindowConfig.mainHeight,
        width: WindowConfig.mainWidth,
        height: WindowConfig.mainHeight,
        skipTaskbar: true,
        resizable: false,
        maximizable: false,
        backgroundColor: await AppsMain.defaultDarkModeBackgroundColor(),
        webPreferences: {
            preload: preloadDefault,
            // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
            nodeIntegration: true,
            webSecurity: false,
            webviewTag: true,
            // Consider using contextBridge.exposeInMainWorld
            // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
            contextIsolation: false,
            // sandbox: false,
        },
    })

    AppRuntime.mainWindow.on('closed', () => {
        AppRuntime.mainWindow = null
    })
    AppRuntime.mainWindow.on('show', async () => {
        await executeHooks(AppRuntime.mainWindow, 'Show')
    });
    AppRuntime.mainWindow.on('hide', async () => {
        await executeHooks(AppRuntime.mainWindow, 'Hide')
    });

    rendererLoadPath(AppRuntime.mainWindow, 'index.html')

    remoteMain.enable(AppRuntime.mainWindow.webContents)
    AppRuntime.mainWindow.webContents.on('did-finish-load', () => {
        Page.ready('main')
        DevToolsManager.autoShow(AppRuntime.mainWindow)
    })
    AppRuntime.mainWindow.webContents.setWindowOpenHandler(({url}) => {
        if (url.startsWith('https://') || url.startsWith('http://')) {
            shell.openExternal(url)
        }
        return {action: 'deny'}
    })
    DevToolsManager.register('Main', AppRuntime.mainWindow)

    FastPanelMain.init()
}

const handleArgsForOpenFile = (argv: string[]) => {
    let filePath = null
    for (let i = 1; i < argv.length; i++) {
        const arg = argv[i]
        if (arg.startsWith('--')) {
            continue
        }
        if (['.'].includes(arg)) {
            continue
        }
        filePath = arg
        break
    }
    if (filePath) {
        ManagerEditor.openQueue(filePath).then()
    }
}

app.on('open-file', (event, path) => {
    event.preventDefault()
    ManagerEditor.openQueue(path).then()
})

app.on('open-url', (event, url) => {
    event.preventDefault()
    ProtocolMain.queue(url).then()
})

app.whenReady()
    .then(() => {
        const isRegistered = app.setAsDefaultProtocolClient('focusany')
        Log.info('ProtocolRegistered', isRegistered)
        remoteMain.initialize()
        session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
            desktopCapturer.getSources({types: ['screen']}).then((sources) => {
                // Grant access to the first screen found.
                callback({video: sources[0], audio: 'loopback'})
            })
        })
    })
    .then(ConfigLang.readyAsync)
    .then(() => {
        if (isMac) {
            app.dock.hide()
        }
        MAPI.ready()
        ConfigMenu.ready()
        ConfigTray.ready()
        app.on('browser-window-created', (_, window) => {
            optimizer.watchWindowShortcuts(window)
        })
        createWindow().then()
        handleArgsForOpenFile(process.argv)
    })

app.on('before-quit', (event) => {
    if (!(app as any).forceQuit) {
        event.preventDefault();
    }
});

app.on('will-quit', () => {
    MAPI.destroy()
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', (event, argv) => {
    if (AppRuntime.mainWindow) {
        if (AppRuntime.mainWindow.isMinimized()) {
            AppRuntime.mainWindow.restore()
        }
        AppRuntime.mainWindow.show()
        AppRuntime.mainWindow.focus()
    }
    handleArgsForOpenFile(argv)
})

app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
        if (!AppRuntime.mainWindow.isVisible()) {
            AppRuntime.mainWindow.show()
        }
        AppRuntime.mainWindow.focus()
    } else {
        createWindow().then()
    }
})
