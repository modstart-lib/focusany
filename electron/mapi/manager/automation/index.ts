import {activeWindow} from "get-windows";
import {ActiveWindow} from "../../../../src/types/Manager";
import robot, {Keys} from "@hurdlegroup/robotjs";

robot.mouseToggle()

export const ManagerAutomation = {
    init() {
    },
    async getActiveWindow(): Promise<ActiveWindow> {
        const win = {
            name: "",
            title: "",
            attr: {},
        } as ActiveWindow;
        const active = await activeWindow();
        if (active) {
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
