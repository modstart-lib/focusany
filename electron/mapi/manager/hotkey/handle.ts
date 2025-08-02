import {ManagerPluginEvent} from "../plugin/event";
import {ManagerConfig} from "../config/config";
import ConfigMain from "../../config/main";

export const ManagerHotkeyHandle = {
    async mainTrigger() {
        if (await ManagerPluginEvent.isMainWindowShown(null, null)) {
            if (await ManagerPluginEvent.isMainWindowFocused(null, null)) {
                await ManagerPluginEvent.hideMainWindow(null, null);
            } else {
                await ManagerPluginEvent.showMainWindow(null, null);
            }
        } else {
            await ManagerPluginEvent.showMainWindow(null, null);
        }
    },
    async fastPanelTrigger() {
        if (!(await ConfigMain.get("fastPanelEnable", true))) {
            return;
        }
        if (await ManagerPluginEvent.isFastPanelWindowShown(null, null)) {
            await ManagerPluginEvent.hideFastPanelWindow(null, null);
        } else {
            await ManagerPluginEvent.showFastPanelWindow(null, null);
        }
    },
    async launch(index: string) {
        const i = parseInt(index);
        const launches = await ManagerConfig.listLaunch();
        if (i < launches.length) {
            await ManagerPluginEvent.redirect(null, {
                keywordsOrAction: launches[i].keyword,
            });
        }
    },
};
