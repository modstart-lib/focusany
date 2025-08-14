import {activeWindow, MacOSOwner, MacOSResult, Result} from "get-windows";
import {ActiveWindow} from "../../../../src/types/Manager";
import robot, {Keys} from "@hurdlegroup/robotjs";
import {isLinux, isMac, isWin} from "../../../lib/env";
import {exec} from "child_process";
import {Log} from "../../log/main";

export const ManagerAutomation = {
    init() {
        ManagerAutomation.track();
    },
    lastWindow: null as Result | null,
    track() {
        setTimeout(async () => {
            const win = await activeWindow();
            if (win) {
                if (!ManagerAutomation.lastWindow || win.id !== ManagerAutomation.lastWindow.id) {
                    if (!ManagerAutomation.trackShouldIgnore(win)) {
                        ManagerAutomation.lastWindow = win;
                    }
                }
            }
            ManagerAutomation.track()
        }, 1000);
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
    restoreLastWindow: async (): Promise<void> => {
        if (ManagerAutomation.lastWindow) {
            if (isMac && (ManagerAutomation.lastWindow.owner as MacOSOwner).bundleId) {
                return new Promise(resolve => {
                    const cmd = `osascript -e 'tell application id "${(ManagerAutomation.lastWindow.owner as MacOSOwner).bundleId}" to activate'`;
                    exec(cmd, (error, stdout, stderr) => resolve());
                })
            } else if (isLinux) {
                //TODO
            } else {
                //TODO
            }
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
