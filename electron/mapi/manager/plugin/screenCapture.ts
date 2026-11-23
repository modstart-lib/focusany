import { exec, execFile } from 'child_process'
import { Notification } from 'electron'
import { t } from '../../../config/lang'
import { extraResolve, isMac, isWin } from '../../../lib/env'
import { AppsMain } from '../../app/main'

const forWindows = (cb: (image: string) => void) => {
    const screenCaptureUrl = extraResolve('win/ScreenCapture.exe')
    const screen_window = execFile(screenCaptureUrl)
    screen_window.on('exit', (code) => {
        if (code) {
            AppsMain.getClipboardImage().then((image) => {
                cb && cb(image)
            })
        }
    })
}

const forMac = (cb: (image: string) => void) => {
    exec('screencapture -i -r -c', () => {
        AppsMain.getClipboardImage().then((image) => {
            cb && cb(image)
        })
    })
}

const forLinux = (cb: (image: string) => void) => {
    const notify = new Notification({
        title: t('system.screenshot'),
        body: t('plugin.screenshotHint'),
    })
    notify.show()
}

export const screenCapture = (cb: (image: string) => void) => {
    AppsMain.setClipboardText('').then()
    if (isMac) {
        forMac(cb)
    } else if (isWin) {
        forWindows(cb)
    } else {
        forLinux(cb)
    }
}
