import { PluginPermissionType, PluginRecord } from '../../../../src/types/Manager'
import { t } from '../../../config/lang'
import { AppsMain } from '../../app/main'

export const ManagerPluginPermission = {
    checkPermit(plugin: PluginRecord, permission: PluginPermissionType): boolean {
        if (plugin.permissions && plugin.permissions.length > 0 && plugin.permissions.includes(permission)) {
            return true
        }
        AppsMain.toast(t('plugin.noPermission', { permission }), { status: 'error' })
        return false
    },
    /**
     * check if the plugin has permission for a specific type and typeData
     * @param plugin
     * @param type basic | event
     * @param typeData
     */
    check(plugin: PluginRecord, type: 'basic' | 'event', typeData: string): boolean {
        // console.log('ManagerPluginPermission.check', JSON.stringify(plugin, null, 2))
        if ('basic' === type) {
            return this.checkPermit(plugin, typeData as PluginPermissionType)
        } else if ('event' === type) {
            if (typeData === 'ClipboardChange') {
                return this.checkPermit(plugin, 'ClipboardManage')
            } else if (['UserChange'].includes(typeData)) {
                return true
            }
        }
        AppsMain.toast(t('plugin.noPermission', { permission: `${type}.${typeData}` }), { status: 'error' })
        return false
    },
}
