import {PluginRecord} from "../../../../src/types/Manager";


export const ManagerPluginPermission = {
    check(plugin: PluginRecord, type: 'event', typeData: string): boolean {
        if (!plugin.permissions || !plugin.permissions.length) {
            return false
        }
        switch (type) {
            case 'event':
                switch (typeData) {
                    case 'ClipboardChange':
                        return plugin.permissions.includes('ClipboardManage')
                }
                break
        }
        return false
    }
}
