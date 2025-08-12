import {Log} from "../../log/main";

export const PluginLog = {
    name: (pluginName: string) => {
        return `Plugin_${pluginName}`
    },
    info: (pluginName: string, label: string, data: any) => {
        const name = PluginLog.name(pluginName);
        Log.appInfo(name, label, data);
    },
    error: (pluginName: string, label: string, data: any) => {
        const name = PluginLog.name(pluginName);
        Log.appError(name, label, data);
    },
}
