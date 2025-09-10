import {Log} from "../../log/main";
import {AppsMain} from "../../app/main";
import {t} from "../../../config/lang";

export const PluginLog = {
    name: (pluginName: string) => {
        return `Plugin_${pluginName}`
    },
    info: (pluginName: string, label: string, data: any) => {
        const name = PluginLog.name(pluginName);
        Log.appInfo(name, label, data);
    },
    error: (pluginName: string, label: string, data: any, toast: boolean = false) => {
        const name = PluginLog.name(pluginName);
        Log.appError(name, label, data);
        if (toast) {
            AppsMain.toast(t('插件{name}错误 : {error}', {
                name: pluginName,
                error: label,
            })).then()
        }
    },
}
