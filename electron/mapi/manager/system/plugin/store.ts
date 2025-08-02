import {ActionTypeEnum, PluginRecord} from "../../../../../src/types/Manager";
import {SystemIcons} from "../asset/icon";

export const StorePlugin: PluginRecord = {
    name: "store",
    title: "插件市场",
    version: "1.0.0",
    logo: SystemIcons.pluginStore,
    description: "提供插件应用市场管理功能",
    main: "<root>/page/store.html",
    preload: "<system>",
    actions: [
        {
            name: "default",
            title: "插件市场",
            type: ActionTypeEnum.WEB,
            icon: SystemIcons.pluginStore,
            matches: ["插件市场", "store"] as any,
        },
    ],
};
