import { exec, execFile } from 'child_process'
import { clipboard, Notification } from 'electron'
import { t } from '../../../config/lang'
import { extraResolve, isMac, isWin } from '../../../lib/env'

const forWindows = (cb: (image: string) => void) => {
    const screenCaptureUrl = extraResolve('win/ScreenCapture.exe')
    const screen_window = execFile(screenCaptureUrl)
    screen_window.on('exit', (code) => {
        if (code) {
            const image = clipboard.readImage()
            cb && cb(image.isEmpty() ? '' : image.toDataURL())
        }
    })
}

const forMac = (cb: (image: string) => void) => {
    exec('screencapture -i -r -c', () => {
        const image = clipboard.readImage()
        cb && cb(image.isEmpty() ? '' : image.toDataURL())
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
    clipboard.writeText('')
    if (isMac) {
        forMac(cb)
    } else if (isWin) {
        forWindows(cb)
    } else {
        forLinux(cb)
    }
}
