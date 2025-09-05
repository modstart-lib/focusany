import {ActionRecord, PluginRecord} from "../../../../src/types/Manager";
import {ManagerSystem} from "../system";
import fs from "node:fs";
import {ImportUtil} from "../../../lib/util";
import {PluginSdkCreate} from "../plugin/sdk";
import {PluginLog} from "../plugin/log";

export const ManagerBackend = {
    async run(
        plugin: PluginRecord,
        type: "hook" | "event" | "action" | "mcpTool",
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
        try {
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
            return await new Promise((resolve, reject) => {
                Promise.resolve(func(sdk, data)).then(resolve).catch(reject);
            });
        } catch (e) {
            PluginLog.error(plugin.name, `Backend.Run.Error-${type}-${key}`, {
                error: e + '',
                data,
                option,
            });
        }
    },
    async runAction(plugin: PluginRecord, action: ActionRecord, option?: {}) {
        const codeData = {};
        codeData["actionName"] = action.name;
        codeData["actionMatch"] = action.runtime?.match;
        try {
            const callback = ManagerSystem.getActionBackendFunc(plugin.name, action.name);
            if (callback) {
                return await callback(codeData);
            }
            return await this.run(plugin, "action", action.name, codeData, {
                rejectIfError: true,
            });
        } catch (e) {
            PluginLog.error(plugin.name, `Backend.RunAction.Error:${action.name}`, e + '');
        }
    },
};
