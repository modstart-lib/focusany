import {Button, Key, keyboard, mouse} from "@nut-tree-fork/nut-js";
import {activeWindow, Result} from "get-windows";
import {windowManager} from "node-window-manager";
import {Window} from "node-window-manager/src/classes/window";
import {ActiveWindow, ClipboardDataType} from "../../../../src/types/Manager";
import {Log} from "../../log/main";
import {ManagerClipboard} from "../clipboard";

export const ManagerAutomation = {
    init() {
        ManagerAutomation.track();
    },
    lastWindow: null as Result | null,
    lastWindowManager: null as Window | null,
    track() {
        windowManager.on('window-activated', async (win) => {
            if (win) {
                if (!ManagerAutomation.lastWindow || win.id !== ManagerAutomation.lastWindow.id) {
                    if (!ManagerAutomation.trackShouldIgnore(win)) {
                        ManagerAutomation.lastWindow = win;
                        ManagerAutomation.lastWindowManager = windowManager.getActiveWindow();
                    }
                }
            }
        });
    },
    trackShouldIgnore(win: Window): boolean {
        if (!win || !win.id) {
            return true;
        }
        if (['Electron', 'FocusAny'].includes(win.getTitle())) {
            return true;
        }
        // if (['FocusAny'].includes(win.getOwner()?.name)) {
        //     return true;
        // }
        Log.info('ManagerAutomation.track', {
            win, title: win.getTitle(), owner: win.getOwner()
        });
        return false;
    },
    async activateLatestWindow(): Promise<void> {
        if (ManagerAutomation.lastWindowManager) {
            ManagerAutomation.lastWindowManager.bringToTop();
        }
    },
    async getActiveWindow(): Promise<ActiveWindow> {
        const win = {
            name: "",
            title: "",
            attr: {},
            raw: null,
        } as ActiveWindow;
        const active = await activeWindow();
        if (active) {
            win.raw = active;
            win.name = active.owner?.name || "";
            win.title = active.title;
            if ("url" in active) {
                win.attr["url"] = active.url + "";
            }
        }
        return win;
    },
    async typeString(text: string): Promise<void> {
        // await keyboard.type(text);
        await ManagerClipboard.pasteClipboardContent({
            type: "text",
            text: text,
        } as ClipboardDataType)
    },
    async typeKey(key: string): Promise<void> {
        const keyMap: { [key: string]: Key } = {
            'a': Key.A,
            'b': Key.B,
            'c': Key.C,
            'd': Key.D,
            'e': Key.E,
            'f': Key.F,
            'g': Key.G,
            'h': Key.H,
            'i': Key.I,
            'j': Key.J,
            'k': Key.K,
            'l': Key.L,
            'm': Key.M,
            'n': Key.N,
            'o': Key.O,
            'p': Key.P,
            'q': Key.Q,
            'r': Key.R,
            's': Key.S,
            't': Key.T,
            'u': Key.U,
            'v': Key.V,
            'w': Key.W,
            'x': Key.X,
            'y': Key.Y,
            'z': Key.Z,
            '0': Key.Num0,
            '1': Key.Num1,
            '2': Key.Num2,
            '3': Key.Num3,
            '4': Key.Num4,
            '5': Key.Num5,
            '6': Key.Num6,
            '7': Key.Num7,
            '8': Key.Num8,
            '9': Key.Num9,
            'space': Key.Space,
            'enter': Key.Enter,
            'tab': Key.Tab,
            'backspace': Key.Backspace,
            'delete': Key.Delete,
            'escape': Key.Escape,
            'shift': Key.LeftShift,
            'control': Key.LeftControl,
            'alt': Key.LeftAlt,
            'command': Key.LeftSuper,
            'left': Key.Left,
            'right': Key.Right,
            'up': Key.Up,
            'down': Key.Down,
            'f1': Key.F1,
            'f2': Key.F2,
            'f3': Key.F3,
            'f4': Key.F4,
            'f5': Key.F5,
            'f6': Key.F6,
            'f7': Key.F7,
            'f8': Key.F8,
            'f9': Key.F9,
            'f10': Key.F10,
            'f11': Key.F11,
            'f12': Key.F12
        };
        const nutKey = keyMap[key.toLowerCase()];
        if (nutKey) {
            await keyboard.pressKey(nutKey);
        }
    },
    async mouseToggle(type: 'down' | 'up', button: 'left' | 'right' | 'middle'): Promise<void> {
        const buttonMap: { [key: string]: Button } = {
            'left': Button.LEFT,
            'right': Button.RIGHT,
            'middle': Button.MIDDLE
        };
        const nutButton = buttonMap[button];
        if (nutButton) {
            if (type === 'down') {
                await mouse.pressButton(nutButton);
            } else {
                await mouse.releaseButton(nutButton);
            }
        }
    },
    async moveMouse(x: number, y: number): Promise<void> {
        await mouse.setPosition({x, y});
    },
    async mouseClick(button: 'left' | 'right' | 'middle', double: boolean = false): Promise<void> {
        const buttonMap: { [key: string]: Button } = {
            'left': Button.LEFT,
            'right': Button.RIGHT,
            'middle': Button.MIDDLE
        };
        const nutButton = buttonMap[button];
        if (nutButton) {
            if (double) {
                await mouse.doubleClick(nutButton);
            } else {
                await mouse.click(nutButton);
            }
        }
    }
};
