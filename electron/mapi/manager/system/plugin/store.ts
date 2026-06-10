import { ActionTypeEnum, PluginRecord } from '../../../../../src/types/Manager'
import { t } from '../../../../config/lang'
import { SystemIcons } from '../asset/icon'

export const StorePlugin: PluginRecord = {
    name: 'store',
    title: t('plugin.market'),
    version: '1.0.0',
    logo: SystemIcons.pluginStore,
    description: t('system.storeDesc'),
    main: '<root>/page/store.html',
    preload: '<system>',
    actions: [
        {
            name: 'default',
            title: t('plugin.market'),
            type: ActionTypeEnum.WEB,
            icon: SystemIcons.pluginStore,
            matches: [t('plugin.market'), 'store'] as any,
        },
    ],
}
