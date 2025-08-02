import {uIOhook, UiohookKey} from "uiohook-napi";

export const KeyboardKey = {
    ...UiohookKey,
};

export const ManagerHotkeySimulate = {
    toCode(key: string) {
        return key in KeyboardKey ? KeyboardKey[key] : key;
    },
    keyTap(key: number, modifiers?: number[]) {
        uIOhook.keyTap(key, modifiers);
    },
};
