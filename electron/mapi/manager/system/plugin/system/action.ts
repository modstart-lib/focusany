import {ActionTypeCodeData} from "../../../../../../src/types/Manager";
import {screenCapture} from "../../../plugin/screenCapture";
import {AppsMain} from "../../../../app/main";
import {Page} from "../../../../../page";
import {ManagerAutomation} from "../../../automation";
import {KeyboardKey, ManagerHotkeySimulate} from "../../../hotkey/simulate";
import {isLinux, isMac, isWin} from "../../../../../lib/env";

export const SystemActionCode = {
    'screenshot': async (focusany: FocusAnyApi, data: ActionTypeCodeData) => {
        screenCapture((image: string) => {
            AppsMain.setClipboardImage(image)
        })
    },
    'guide': async (focusany: FocusAnyApi, data: ActionTypeCodeData) => {
        Page.open('guide', {}).then()
    },
    'lock': async (focusany: FocusAnyApi, data: ActionTypeCodeData) => {
        if (isMac) {
            ManagerHotkeySimulate.keyTap(KeyboardKey.Q, [KeyboardKey.Meta, KeyboardKey.Ctrl])
        } else if (isWin) {
            ManagerHotkeySimulate.keyTap(KeyboardKey.L, [KeyboardKey.Meta])
        } else if (isLinux) {
            ManagerHotkeySimulate.keyTap(KeyboardKey.L, [KeyboardKey.Meta])
        }
    }
}
