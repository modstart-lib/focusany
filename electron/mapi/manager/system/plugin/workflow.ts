import { ActionTypeEnum, PluginRecord } from '../../../../../src/types/Manager'
import { t } from '../../../../config/lang'
import { SystemIcons } from '../asset/icon'

export const WorkflowPlugin: PluginRecord = {
    name: 'workflow',
    title: t('workflow.workflow'),
    version: '1.0.0',
    logo: SystemIcons.pluginWorkflow,
    description: t('system.workflowDesc'),
    main: '<root>/page/workflow.html',
    preload: '<system>',
    actions: [
        {
            name: 'default',
            title: t('workflow.workflow'),
            type: ActionTypeEnum.WEB,
            icon: SystemIcons.pluginWorkflow,
            matches: [t('workflow.workflow'), 'workflow'] as any,
        },
    ],
}
