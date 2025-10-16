import {ActionTypeCodeData} from "../../../../../../src/types/Manager";
import {screenCapture} from "../../../plugin/screenCapture";
import {AppsMain} from "../../../../app/main";
import {Page} from "../../../../../page";
import {KeyboardKey, ManagerHotkeySimulate} from "../../../hotkey/simulate";
import {isLinux, isMac, isWin} from "../../../../../lib/env";
import os from "os";
import {colorPicker} from "../../../plugin/colorPicker";

export const SystemActionCode = {
    screenshot: async (data: ActionTypeCodeData) => {
        screenCapture((image: string) => {
            AppsMain.setClipboardImage(image);
        });
    },
    colorPicker: async (data: ActionTypeCodeData) => {
        colorPicker().then();
    },
    guide: async (data: ActionTypeCodeData) => {
        await Page.open("guide", {})
    },
    about: async (data: ActionTypeCodeData) => {
        await Page.open("about", {})
    },
    lock: async (data: ActionTypeCodeData) => {
        if (isMac) {
            ManagerHotkeySimulate.keyTap(KeyboardKey.Q, [KeyboardKey.Meta, KeyboardKey.Ctrl]);
        } else if (isWin) {
            ManagerHotkeySimulate.keyTap(KeyboardKey.L, [KeyboardKey.Meta]);
        } else if (isLinux) {
            ManagerHotkeySimulate.keyTap(KeyboardKey.L, [KeyboardKey.Meta]);
        }
    },
    ip: async (data: ActionTypeCodeData) => {
        const ip = getLocalIPAddress();
        AppsMain.setClipboardText(ip);
        AppsMain.toast(`IP地址 ${ip} 已复制到剪贴板`);
    },
};

function getLocalIPAddress() {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "127.0.0.1";
}
