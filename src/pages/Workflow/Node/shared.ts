import { WorkflowNode, WorkflowNodeField, WorkflowNodeType } from '../types'

export const iconText = (type: WorkflowNodeType) => {
    if (type === 'trigger') return '↯'
    if (type === 'command') return '>_'
    if (type === 'js') return 'JS'
    if (type === 'condition') return '?'
    if (type === 'llm') return 'AI'
    return 'P'
}

export const nodeTypeTitle = (type: WorkflowNodeType, t: (key: string) => string) => {
    const map: Record<WorkflowNodeType, string> = {
        trigger: t('workflow.nodeTypeTrigger'),
        command: t('workflow.nodeTypeCommand'),
        js: '执行JS',
        condition: t('workflow.nodeTypeCondition'),
        llm: t('workflow.nodeTypeLlm'),
        plugin: t('workflow.nodeTypePlugin'),
    }
    return map[type] || type
}

export const subTitle = (type: WorkflowNodeType, t: (key: string) => string) => {
    const map: Record<WorkflowNodeType, string> = {
        trigger: t('workflow.nodeTypeTrigger'),
        command: t('workflow.nodeTypeCommand'),
        js: '执行JS',
        condition: t('workflow.nodeTypeCondition'),
        llm: t('workflow.nodeTypeLlm'),
        plugin: t('workflow.nodeTypePlugin'),
    }
    return map[type] || ''
}

export const ensureField = (node: WorkflowNode, field: WorkflowNodeField) => {
    const fields = node.properties.inputFields || []
    let target = fields.find((item) => item.name === field.name)
    if (!target) {
        target = { ...field }
        fields.push(target)
        node.properties.inputFields = fields
    }
    return target
}
