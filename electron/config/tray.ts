import { app, Menu, shell, Tray } from 'electron'
import { trayPath } from './icon'
import { AppRuntime } from '../mapi/env'
import { AppConfig } from '../../src/config'
import { t } from './lang'
import { isMac, isWin } from '../lib/env'
import { AppsMain } from '../mapi/app/main'

let tray = null

const showApp = () => {
    AppRuntime.mainWindow.show()
    AppRuntime.mainWindow.focus()
}

const hideApp = () => {
    if (isMac) {
        app.dock.hide()
    }
    AppRuntime.mainWindow.hide()
}

const quitApp = () => {
    ;(app as any).forceQuit = true
    app.quit()
}

const ready = () => {
    const contextMenu = Menu.buildFromTemplate([
        {
            label: t('tray.showMain'),
            click: () => {
                showApp()
            },
        },
        {
            label: t('nav.guide'),
            click: () => {
                AppsMain.windowOpen('guide').then()
            },
        },
        {
            label: t('tray.visitWebsite'),
            click: () => {
                shell.openExternal(AppConfig.website)
            },
        },
        { type: 'separator' },
        {
            label: t('tray.restart'),
            click: () => {
                app.relaunch()
                quitApp()
            },
        },
        {
            label: t('menu.quit'),
            click: () => {
                quitApp()
            },
        },
        { type: 'separator' },
        {
            label: t('about.title'),
            click: () => {
                AppsMain.windowOpen('about').then()
            },
        },
    ])
    tray = new Tray(trayPath)
    tray.setToolTip(AppConfig.name)
    tray.on('click', () => {
        showApp()
    })
    tray.on('right-click', () => {
        tray.popUpContextMenu(contextMenu)
    })
}

const show = () => {
    if (tray) {
        tray.destroy()
        tray = null
    }
}

export const ConfigTray = {
    ready,
}
