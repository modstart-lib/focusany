import {PluginRecord} from "../../../../src/types/Manager";
import {AppsMain} from "../../app/main";


export const ManagerPluginPermission = {
    check(plugin: PluginRecord, type: 'event', typeData: string): boolean {
        if (!plugin.permissions || !plugin.permissions.length) {
            return false
        }
        switch (type) {
            case 'event':
                switch (typeData) {
                    case 'ClipboardChange':
                        if (plugin.permissions.includes('ClipboardManage')) {
                            return true
                        }
                        AppsMain.toast(`插件没有权限(ClipboardManage)`, {status: 'error'})
                        break;
                }
                break
        }
        return false
    }
}
