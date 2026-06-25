import { WorkflowNodeField, WorkflowNodeType, WorkflowNodeTypeOption } from './types'

export const workflowNodeTypes: WorkflowNodeTypeOption[] = [
    { type: 'trigger', title: '触发节点' },
    { type: 'command', title: '执行命令' },
    { type: 'js', title: '执行JS' },
    { type: 'condition', title: '条件节点' },
    { type: 'llm', title: '大模型节点' },
    { type: 'plugin', title: '调用插件' },
]

export const workflowNodeColor = (type: WorkflowNodeType) => {
    const map: Record<WorkflowNodeType, string> = {
        trigger: 'bg-emerald-50 border-emerald-300 text-emerald-700',
        command: 'bg-blue-50 border-blue-300 text-blue-700',
        js: 'bg-cyan-50 border-cyan-300 text-cyan-700',
        condition: 'bg-amber-50 border-amber-300 text-amber-700',
        llm: 'bg-purple-50 border-purple-300 text-purple-700',
        plugin: 'bg-rose-50 border-rose-300 text-rose-700',
    }
    return map[type]
}

export const workflowNodeFieldDefinitions = (type: WorkflowNodeType) => {
    const map: Record<WorkflowNodeType, { inputFields: WorkflowNodeField[]; outputFields: WorkflowNodeField[] }> = {
        trigger: {
            inputFields: [],
            outputFields: [],
        },
        command: {
            inputFields: [],
            outputFields: [],
        },
        js: {
            inputFields: [],
            outputFields: [{ name: 'Result', title: '执行结果', type: 'text' }],
        },
        condition: {
            inputFields: [],
            outputFields: [],
        },
        llm: {
            inputFields: [],
            outputFields: [{ name: 'Content', title: '回复内容', type: 'text' }],
        },
        plugin: {
            inputFields: [],
            outputFields: [{ name: 'Result', title: '调用结果', type: 'any' }],
        },
    }
    return {
        inputFields: map[type].inputFields.map((field) => ({ ...field })),
        outputFields: map[type].outputFields.map((field) => ({ ...field })),
    }
}

export const defaultWorkflowNodeProperties = (type: WorkflowNodeType) => {
    const fields = workflowNodeFieldDefinitions(type)
    if (type === 'trigger')
        return { ...fields, triggerType: 'manual', cronExpression: '* * * * *', eventName: 'demo.event' }
    if (type === 'command') return { ...fields, command: 'pwd' }
    if (type === 'js')
        return {
            ...fields,
            code: `;(function () {
    return 'js result'
})()`,
            outputType: 'text',
        }
    if (type === 'condition') return { ...fields, leftValue: 'ok', operator: 'contains', rightValue: 'ok' }
    if (type === 'llm') return { ...fields, modelProvider: '', prompt: '总结上一节点输出' }
    return {
        ...fields,
        mcpToolName: 'BasicExample-GetWeather',
        pluginName: 'BasicExample',
        toolName: 'GetWeather',
        arguments: { city: '杭州' },
    }
}
