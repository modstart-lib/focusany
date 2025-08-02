import {ActionRecord, PluginRecord} from "../../../../src/types/Manager";
import {ManagerSystem} from "../system";
import {ManagerWindow} from "../window";

export const ManagerCode = {
    async execute(plugin: PluginRecord, action: ActionRecord, option?: {}) {
        const codeData = {};
        codeData["actionName"] = action.name;
        codeData["actionMatch"] = action.runtime?.match;
        codeData["requestId"] = action.runtime?.requestId;
        const callback = ManagerSystem.getActionCodeFunc(plugin.name, action.name);
        if (callback) {
            return await callback(codeData);
        }
        return await ManagerWindow.openForCode(plugin, action, {
            codeData,
        });
    },
};
