import {
    ActionRecord,
    ConfigRecord,
    LaunchRecord,
    PluginActionRecord,
    PluginConfig,
    PluginRecord,
} from "../../../../src/types/Manager";

import {KVDBMain} from "../../kvdb/main";
import {CommonConfig} from "../../../config/common";
import {ManagerHotkey} from "../hotkey";
import {MemoryCacheUtil} from "../../../lib/util";
import {ManagerPlugin} from "../plugin";
import {ManagerSystem} from "../system";
import {isLinux, isMac, isWin} from "../../../lib/env";

const defaultConfig: ConfigRecord = {
    mainTrigger: {
        key: "Space",
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        times: 1,
    },
    detachWindowTrigger: {
        key: "D",
        altKey: false,
        ctrlKey: !isMac,
        metaKey: isMac,
        shiftKey: false,
        times: 1,
    },
    fastPanelTrigger: {
        type: "Ctrl",
        times: 1,
    },
    // fastPanelTriggerButton: {
    //     button: HotkeyMouseButtonEnum.RIGHT,
    //     type: 'longPress',
    // },
};

export const ManagerConfig = {
    configOld: null as ConfigRecord | null,
    async clearCache() {
        MemoryCacheUtil.forget("Config");
        MemoryCacheUtil.forget("DisabledActionMatches");
        MemoryCacheUtil.forget("PinActions");
        MemoryCacheUtil.forget("Launches");
        MemoryCacheUtil.forget("CustomActions");
        MemoryCacheUtil.forget("HistoryActions");
        MemoryCacheUtil.forget("PluginConfig");
    },
    async get(): Promise<ConfigRecord> {
        return MemoryCacheUtil.remember("Config", async () => {
            // reset config
            // await this.save(defaultConfig)
            const config = await KVDBMain.getData(CommonConfig.dbSystem, CommonConfig.dbConfigId);
            if (!config) {
                await this.save(defaultConfig);
                this.configOld = defaultConfig;
                return defaultConfig;
            }
            let changed = false;
            for (const key in defaultConfig) {
                if (key in config) {
                    if (typeof config[key] === "object") {
                        for (const subKey in defaultConfig[key]) {
                            if (subKey in config[key]) {
                            } else {
                                config[key][subKey] = defaultConfig[key][subKey];
                                changed = true;
                            }
                        }
                    }
                } else {
                    config[key] = defaultConfig[key];
                    changed = true;
                }
            }
            if (changed) {
                await this.save(config);
            }
            this.configOld = config;
            return config;
        });
    },
    async save(config: ConfigRecord): Promise<void> {
        delete config["data"];
        const doc = {
            _id: CommonConfig.dbConfigId,
            ...config,
        };
        await KVDBMain.putForce(CommonConfig.dbSystem, doc);
        let hotkeyChanged = false;
        if (this.configOld) {
            for (const k of ["mainTrigger", "fastPanelTrigger"]) {
                if (JSON.stringify(this.configOld[k]) !== JSON.stringify(config[k])) {
                    hotkeyChanged = true;
                    break;
                }
            }
        }
        MemoryCacheUtil.forget("Config");
        if (hotkeyChanged) {
            ManagerHotkey.configInit().then();
        }
    },
    async listDisabledActionMatch() {
        return MemoryCacheUtil.remember("DisabledActionMatches", async () => {
            return (await KVDBMain.getData(CommonConfig.dbSystem, CommonConfig.dbDisabledActionMatchId)) || {};
        });
    },
    async toggleDisabledActionMatch(pluginName: string, actionName: string, matchName: string) {
        let matches = await this.listDisabledActionMatch();
        if (!matches) {
            matches = {};
        }
        if (!matches[pluginName]) {
            matches[pluginName] = {};
        }
        if (!matches[pluginName][actionName]) {
            matches[pluginName][actionName] = [];
        }
        let disabled = false;
        if (matches[pluginName][actionName].includes(matchName)) {
            matches[pluginName][actionName] = matches[pluginName][actionName].filter(v => v !== matchName);
            if (!matches[pluginName][actionName].length) {
                delete matches[pluginName][actionName];
            }
            if (!Object.keys(matches[pluginName]).length) {
                delete matches[pluginName];
            }
        } else {
            matches[pluginName][actionName].push(matchName);
            disabled = true;
        }
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: CommonConfig.dbDisabledActionMatchId,
            ...matches,
        });
        MemoryCacheUtil.forget("DisabledActionMatches");
        return disabled;
    },
    async listPinAction(): Promise<PluginActionRecord[]> {
        return MemoryCacheUtil.remember("PinActions", async () => {
            const res = await KVDBMain.getData(CommonConfig.dbSystem, CommonConfig.dbPinActionId);
            if (!res) {
                return [];
            }
            return res["records"] || [];
        });
    },
    async getPinedActionSet(): Promise<Set<string>> {
        const pinActions = await this.listPinAction();
        const set = new Set<string>();
        for (const pinAction of pinActions) {
            set.add(`${pinAction.pluginName}/${pinAction.actionName}`);
        }
        return set;
    },
    async togglePinAction(pluginName: string, actionName: string) {
        let pinActions = await this.listPinAction();
        const saveAction = {
            pluginName: pluginName,
            actionName: actionName,
        } as PluginActionRecord;
        const exists = pinActions.find(
            v => v.pluginName === saveAction.pluginName && v.actionName === saveAction.actionName
        );
        if (exists) {
            pinActions = pinActions.filter(
                v => v.pluginName !== saveAction.pluginName || v.actionName !== saveAction.actionName
            );
        } else {
            pinActions.unshift(saveAction);
        }
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: CommonConfig.dbPinActionId,
            records: pinActions,
        });
        MemoryCacheUtil.forget("PinActions");
    },
    async listLaunch(): Promise<LaunchRecord[]> {
        return MemoryCacheUtil.remember("Launches", async () => {
            const res = await KVDBMain.getData(CommonConfig.dbSystem, CommonConfig.dbLaunchId);
            if (!res) {
                return [];
            }
            return res["records"] || [];
        });
    },
    async updateLaunch(records: LaunchRecord[]) {
        // normalize records
        records.forEach(record => {
            if (!("type" in record)) {
                // @ts-ignore
                record.type = "custom"
            }
            if (!("name" in record)) {
                // @ts-ignore
                record.name = "";
            }
        })
        // sort records by type(custom,plugin) and name(a-z)
        records.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type.localeCompare(b.type);
        });
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: CommonConfig.dbLaunchId,
            records: records,
        });
        MemoryCacheUtil.forget("Launches");
        ManagerHotkey.configInit().then()
    },
    async getCustomAction(): Promise<Record<string, ActionRecord[]>> {
        return MemoryCacheUtil.remember("CustomActions", async () => {
            return (await KVDBMain.getData(CommonConfig.dbSystem, CommonConfig.dbCustomActionId)) || {};
        });
    },
    async addCustomAction(plugin: PluginRecord, action: ActionRecord | ActionRecord[]) {
        const customAction = await this.getCustomAction();
        if (!(plugin.name in customAction)) {
            customAction[plugin.name] = [];
        }
        if (!Array.isArray(action)) {
            action = [action];
        }
        for (let a of action) {
            a = ManagerPlugin.normalAction(a, plugin);
            let replace = false;
            for (let i = 0; i < customAction[plugin.name].length; i++) {
                if (customAction[plugin.name][i].name === a.name) {
                    customAction[plugin.name][i] = a;
                    replace = true;
                    break;
                }
            }
            if (!replace) {
                customAction[plugin.name].push(a);
            }
        }
        delete customAction["data"];
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: CommonConfig.dbCustomActionId,
            ...customAction,
        });
        MemoryCacheUtil.forget("CustomActions");
    },
    async removeCustomAction(plugin: PluginRecord, name: string) {
        const customAction = await this.getCustomAction();
        if (!(plugin.name in customAction)) {
            return;
        }
        customAction[plugin.name] = customAction[plugin.name].filter(v => v.name !== name);
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: CommonConfig.dbCustomActionId,
            ...customAction,
        });
        MemoryCacheUtil.forget("CustomActions");
    },
    async getHistoryAction(): Promise<PluginActionRecord[]> {
        return MemoryCacheUtil.remember("HistoryActions", async () => {
            const res = await KVDBMain.getData(CommonConfig.dbSystem, CommonConfig.dbHistoryActionId);
            if (!res) {
                return [];
            }
            return res["records"] || [];
        });
    },
    async clearHistoryAction() {
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: CommonConfig.dbHistoryActionId,
            records: [],
        });
        MemoryCacheUtil.forget("HistoryActions");
    },
    async deleteHistoryAction(pluginName: string, actionName: string) {
        // console.log('deleteHistoryAction', fullName)
        let historyActions = await this.getHistoryAction();
        historyActions = historyActions.filter(v => v.pluginName !== pluginName || v.actionName !== actionName);
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: CommonConfig.dbHistoryActionId,
            records: historyActions,
        });
        MemoryCacheUtil.forget("HistoryActions");
    },
    async addHistoryAction(plugin: PluginRecord, action: ActionRecord) {
        let historyActions = await this.getHistoryAction();
        const saveAction = {
            pluginName: plugin.name,
            actionName: action.name,
        } as PluginActionRecord;
        // remove duplicate
        historyActions = historyActions.filter(
            v => v.pluginName !== saveAction.pluginName || v.actionName !== saveAction.actionName
        );
        historyActions.unshift(saveAction);
        if (historyActions.length > 100) {
            historyActions.pop();
        }
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: CommonConfig.dbHistoryActionId,
            records: historyActions,
        });
        MemoryCacheUtil.forget("HistoryActions");
    },
    async getPluginConfigAll(): Promise<Record<string, PluginConfig>> {
        return MemoryCacheUtil.remember("PluginConfig", async () => {
            const res = await KVDBMain.getData(CommonConfig.dbSystem, CommonConfig.dbPluginConfigId);
            if (!res) {
                return {};
            }
            return res["records"] || {};
        });
    },
    async getPluginConfig(pluginName: string): Promise<PluginConfig> {
        const res = await this.getPluginConfigAll();
        return res[pluginName] || {};
    },
    async setPluginConfigItem(pluginName: string, key: string, value: any) {
        const config = await this.getPluginConfig(pluginName);
        config[key] = value;
        await ManagerConfig.setPluginConfig(pluginName, config);
        if (ManagerSystem.match(pluginName)) {
            await ManagerSystem.clearCache();
        } else {
            await ManagerPlugin.clearCache();
        }
    },
    async setPluginConfig(pluginName: string, config: PluginConfig) {
        const pluginConfig = await this.getPluginConfigAll();
        pluginConfig[pluginName] = config;
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: CommonConfig.dbPluginConfigId,
            records: pluginConfig,
        });
        MemoryCacheUtil.forget("PluginConfig");
    },
};
