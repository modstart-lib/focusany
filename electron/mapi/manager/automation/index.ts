import {activeWindow, MacOSOwner, MacOSResult, Result} from "get-windows";
import {windowManager} from "node-window-manager";
import {ActiveWindow} from "../../../../src/types/Manager";
import robot, {Keys} from "@hurdlegroup/robotjs";
import {isLinux, isMac, isWin} from "../../../lib/env";
import {exec} from "child_process";
import {Log} from "../../log/main";
import {Window} from "node-window-manager/src/classes/window";

export const ManagerAutomation = {
    init() {
        ManagerAutomation.track();
    },
    lastWindow: null as Result | null,
    lastWindowManager: null as Window | null,
    track() {
        setTimeout(async () => {
            const win = await activeWindow();
            if (win) {
                if (!ManagerAutomation.lastWindow || win.id !== ManagerAutomation.lastWindow.id) {
                    if (!ManagerAutomation.trackShouldIgnore(win)) {
                        ManagerAutomation.lastWindow = win;
                        ManagerAutomation.lastWindowManager = windowManager.getActiveWindow();
                    }
                }
            }
            ManagerAutomation.track()
        }, 500);
    },
    trackShouldIgnore(win: Result): boolean {
        if ('Electron' === win.owner.name && '%name%' === win.title) {
            return true;
        }
        if (['FocusAny'].includes(win.owner.name)) {
            return true;
        }
        Log.info('ManagerAutomation.track', win);
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
        robot.typeString(text);
    },
    async typeKey(key: Keys): Promise<void> {
        robot.keyTap(key);
    },
    async mouseToggle(type: 'down' | 'up', button: 'left' | 'right' | 'middle'): Promise<void> {
        robot.mouseToggle(type, button);
    },
    async moveMouse(x: number, y: number): Promise<void> {
        robot.moveMouse(x, y);
    },
    async mouseClick(button: 'left' | 'right' | 'middle', double: boolean = false): Promise<void> {
        robot.mouseClick(button, double);
    }
};
