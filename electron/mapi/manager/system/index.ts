import {ActionRecord, PluginRecord, PluginType} from "../../../../src/types/Manager";
import {SystemPlugin} from "./plugin/system";
import {SystemActionCode} from "./plugin/system/action";
import {StorePlugin} from "./plugin/store";
import {StoreActionCode} from "./plugin/store/action";
import {MemoryCacheUtil} from "../../../lib/util";
import {ManagerPlugin} from "../plugin";
import {getAppPlugin} from "./plugin/app";
import {getFilePlugin} from "./plugin/file";

const pluginActionCode = {
    system: SystemActionCode,
    store: StoreActionCode,
};

const systemPlugin = new Set(["system", "store", "workflow", "app", "file"]);

const pluginActionBackend = {};

export const ManagerSystem = {
    async clearCache() {
        for (const p of await this.list()) {
            delete p.runtime;
        }
        MemoryCacheUtil.forget("SystemActions");
    },
    match(name: string) {
        return systemPlugin.has(name);
    },
    async list() {
        const plugins: (PluginRecord | any)[] = [SystemPlugin, StorePlugin, getAppPlugin, getFilePlugin];
        for (let i = 0; i < plugins.length; i++) {
            if (typeof plugins[i] === "function") {
                plugins[i] = await plugins[i]();
            }
            plugins[i] = await ManagerPlugin.initIfNeed(plugins[i], {
                type: PluginType.SYSTEM,
                root: null,
            });
        }
        return plugins as PluginRecord[];
    },
    getActionCodeFunc(pluginName: string, name: string) {
        if (!pluginActionCode[pluginName]) {
            return null;
        }
        return pluginActionCode[pluginName][name] || null;
    },
    getActionBackendFunc(pluginName: string, name: string) {
        if (!pluginActionBackend[pluginName]) {
            return null;
        }
        return pluginActionBackend[pluginName][name] || null;
    },
    async listAction() {
        return await MemoryCacheUtil.remember("SystemActions", async () => {
            let actions: ActionRecord[] = [];
            const plugins = await this.list();
            for (const p of plugins) {
                actions = actions.concat(p.actions);
            }
            return actions;
        });
    },
};
