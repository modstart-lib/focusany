import {ActionRecord, PluginRecord} from "../../../../src/types/Manager";
import {ManagerSystem} from "../system";
import fs from "node:fs";
import {ImportUtil} from "../../../lib/util";
import {PluginSdkCreate} from "../plugin/sdk";

export const ManagerBackend = {
    async run(
        plugin: PluginRecord,
        type: "hook" | "event" | "action",
        key: string,
        data: any,
        option?: {
            rejectIfError: boolean;
        }
    ) {
        option = Object.assign(
            {
                rejectIfError: false,
            },
            option
        );
        if (!plugin.runtime?.root) {
            throw `PluginRootNotFound:${plugin.name}:${type}:${key}`;
        }
        const backendPath = `${plugin.runtime?.root}/backend.cjs`;
        if (!fs.existsSync(backendPath)) {
            if (option.rejectIfError) {
                throw `BackendFileNotFound:${backendPath}`;
            }
            return;
        }
        const backend = await ImportUtil.loadCommonJs(backendPath);
        if (!(type in backend)) {
            if (option.rejectIfError) {
                throw `BackendTypeNotFound:${type}`;
            }
            return;
        }
        if (!(key in backend[type])) {
            if (option.rejectIfError) {
                throw `BackendKeyNotFound:${type}.${key}`;
            }
            return;
        }
        const func = backend[type][key];
        const sdk = PluginSdkCreate(plugin);
        return await func(sdk, data);
    },
    async runAction(plugin: PluginRecord, action: ActionRecord, option?: {}) {
        const codeData = {};
        codeData["actionName"] = action.name;
        codeData["actionMatch"] = action.runtime?.match;
        const callback = ManagerSystem.getActionBackendFunc(plugin.name, action.name);
        if (callback) {
            return await callback(codeData);
        }
        return await this.run(plugin, "action", action.name, codeData, {
            rejectIfError: true,
        });
    },
};
