import {PluginPermissionType, PluginRecord} from "../../../../src/types/Manager";
import {AppsMain} from "../../app/main";


export const ManagerPluginPermission = {
    checkPermit(plugin: PluginRecord, permission: PluginPermissionType): boolean {
        if (plugin.permissions && plugin.permissions.length > 0 && plugin.permissions.includes(permission)) {
            return true
        }
        AppsMain.toast(`插件没有权限(${permission})`, {status: 'error'})
        return false
    },
    check(plugin: PluginRecord, type: 'basic' | 'event', typeData: string): boolean {
        if ('basic' === type) {
            return this.checkPermit(plugin, typeData as PluginPermissionType)
        } else if ('event' === type) {
            if (typeData === 'ClipboardChange') {
                return this.checkPermit(plugin, 'ClipboardManage')
            } else if (['UserChange'].includes(typeData)) {
                return true
            }
        }
        AppsMain.toast(`插件没有权限(${type}.${typeData})`, {status: 'error'})
        return false
    }
}
