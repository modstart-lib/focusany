import {app, Menu, shell, Tray} from 'electron'
import {trayPath} from "./icon";
import {AppRuntime} from "../mapi/env";
import {AppConfig} from "../../src/config";
import {t} from "./lang";
import {isMac, isWin} from "../lib/env";
import {AppsMain} from "../mapi/app/main";

let tray = null

const showApp = () => {
    if (isMac) {
        app.dock.show()
    }
    AppRuntime.mainWindow.show()
}

const hideApp = () => {
    if (isMac) {
        app.dock.hide()
    }
    AppRuntime.mainWindow.hide()
}

const quitApp = () => {
    (app as any).forceQuit = true
    app.quit()
}

const ready = () => {
    tray = new Tray(trayPath)

    tray.setToolTip(AppConfig.name)

    if (isWin) {
        tray.on('click', () => {
            showApp()
        })
    }

    const contextMenu = Menu.buildFromTemplate([
        {
            label: t('显示主界面'),
            click: () => {
                showApp()
            },
        },
        {
            label: t('新手指引'),
            click: () => {
                AppsMain.windowOpen('guide').then()
            },
        },
        {
            label: t('访问官网'),
            click: () => {
                shell.openExternal(AppConfig.website)
            },
        },
        {type: 'separator'},
        {
            label: t('重启'),
            click: () => {
                app.relaunch()
                quitApp()
            },
        },
        {
            label: t('退出'),
            click: () => {
                quitApp()
            },
        },
        {type: 'separator'},
        {
            label: t('关于'),
            click: () => {
                AppsMain.windowOpen('about').then()
            },
        },
    ])

    tray.setContextMenu(contextMenu)
}

const show = () => {

    if (tray) {
        tray.destroy()
        tray = null
    }
}


export const ConfigTray = {
    ready
}
