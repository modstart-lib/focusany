import {activeWindow} from "get-windows";
import {ActiveWindow} from "../../../../src/types/Manager";
import {isWin} from "../../../lib/env";

export const ManagerAutomation = {
    init() {},
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
};
