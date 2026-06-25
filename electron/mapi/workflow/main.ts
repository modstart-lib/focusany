import { exec } from 'node:child_process'
import { Script } from 'node:vm'
import { ipcMain } from 'electron'
import { KVDBMain } from '../kvdb/main'
import { listModels, modelChat } from '../manager/plugin/llm'
import { PluginHttpMCP } from '../manager/plugin/httpMCP'
import {
    WorkflowEdgeRecord,
    WorkflowGraphRecord,
    WorkflowNodeFieldRecord,
    WorkflowNodeRecord,
    WorkflowRecord,
    WorkflowRunRecord,
    WorkflowTriggerType,
} from './types'

const WORKFLOW_NAMESPACE = 'workflow'
const WORKFLOW_LOG_NAMESPACE = 'workflow_log'
const timers = new Map<string, NodeJS.Timeout>()
const timerLastRuns = new Map<string, string>()

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const emptyGraph = (): WorkflowGraphRecord => ({ nodes: [], edges: [] })

const defaultNodeFields = (type: WorkflowNodeRecord['type']) => {
    const map: Record<
        WorkflowNodeRecord['type'],
        { inputFields: WorkflowNodeFieldRecord[]; outputFields: WorkflowNodeFieldRecord[] }
    > = {
        trigger: { inputFields: [], outputFields: [] },
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
        plugin: { inputFields: [], outputFields: [{ name: 'Result', title: '调用结果', type: 'any' }] },
    }
    return {
        inputFields: map[type].inputFields.map((field) => ({ ...field })),
        outputFields: map[type].outputFields.map((field) => ({ ...field })),
    }
}

const validateGraph = (data: WorkflowGraphRecord) => {
    const triggers = (data.nodes || []).filter((node) => node.type === 'trigger')
    if (triggers.length !== 1) {
        throw new Error(triggers.length ? 'WorkflowTriggerOnlyOne' : 'WorkflowTriggerRequired')
    }
}

const normalizeGraph = (data?: WorkflowGraphRecord): WorkflowGraphRecord => {
    const graph = data || emptyGraph()
    const nodes = (graph.nodes || []).map((node) => {
        const fields = defaultNodeFields(node.type)
        const properties = { ...(node.properties || {}) }
        if (node.type === 'command' && !properties.command) {
            const commandField = (properties.inputFields || []).find((item: any) => item.name === 'Command')
            if (commandField?.value) properties.command = commandField.value
        }
        properties.inputFields =
            node.type === 'command' || node.type === 'js' || node.type === 'condition' || node.type === 'llm'
                ? []
                : properties.inputFields || fields.inputFields
        properties.outputFields =
            node.type === 'trigger' || node.type === 'command' || node.type === 'condition'
                ? []
                : properties.outputFields || fields.outputFields
        return { ...node, properties }
    })
    const nodeIds = new Set(nodes.map((node) => node.id))
    const edges = (graph.edges || [])
        .filter((edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId))
        .filter((edge) => nodes.find((node) => node.id === edge.targetNodeId)?.type !== 'trigger')
        .map((edge) => ({ ...edge }))
    const normalized = { nodes, edges }
    validateGraph(normalized)
    return normalized
}

/** Strip PouchDB internal fields (_id, _rev) from kvdb documents */
const cleanDoc = (doc: Record<string, any>) => {
    const { _id, _rev, ...rest } = doc
    return rest
}

const list = async (): Promise<WorkflowRecord[]> => {
    const docs = await KVDBMain.allDocs(WORKFLOW_NAMESPACE, '')
    return docs.map(cleanDoc) as WorkflowRecord[]
}

const listLog = async (): Promise<WorkflowRunRecord[]> => {
    const docs = await KVDBMain.allDocs(WORKFLOW_LOG_NAMESPACE, '')
    return docs.map(cleanDoc).sort((a, b) => b.startedAt - a.startedAt) as WorkflowRunRecord[]
}

const get = async (id: string): Promise<WorkflowRecord | null> => {
    const doc = await KVDBMain.get(WORKFLOW_NAMESPACE, id)
    if (!doc) return null
    return cleanDoc(doc) as WorkflowRecord
}

const insert = async (payload: Partial<WorkflowRecord>) => {
    const now = Date.now()
    const record: WorkflowRecord = {
        id: createId('wf'),
        name: payload.name || '未命名工作流',
        enabled: payload.enabled ?? true,
        data: normalizeGraph(payload.data),
        createdAt: now,
        updatedAt: now,
    }
    await KVDBMain.putForce(WORKFLOW_NAMESPACE, { _id: record.id, ...record })
    await refreshTimers()
    return record
}

const update = async (payload: Partial<WorkflowRecord> & { id: string }) => {
    const existing = await get(payload.id)
    if (!existing) throw new Error('WorkflowNotFound')
    const record = {
        ...existing,
        ...payload,
        data: normalizeGraph(payload.data || existing.data),
        updatedAt: Date.now(),
    }
    await KVDBMain.putForce(WORKFLOW_NAMESPACE, { _id: record.id, ...record })
    await refreshTimers()
    return record
}

const remove = async (id: string) => {
    await KVDBMain.remove(WORKFLOW_NAMESPACE, id)
    await refreshTimers()
}

/** Persist a single log entry and cap total logs at 50 */
const saveLog = async (log: WorkflowRunRecord) => {
    await KVDBMain.putForce(WORKFLOW_LOG_NAMESPACE, { _id: log.id, ...log })
    // Cap at 50: remove oldest if exceeding
    const docs = await KVDBMain.allDocs(WORKFLOW_LOG_NAMESPACE, '')
    if (docs.length > 50) {
        docs.sort((a, b) => a.startedAt - b.startedAt)
        const toRemove = docs.slice(0, docs.length - 50)
        for (const doc of toRemove) {
            await KVDBMain.remove(WORKFLOW_LOG_NAMESPACE, doc)
        }
    }
}

const getStartNodes = (data: WorkflowGraphRecord, triggerType: WorkflowTriggerType, eventName?: string) => {
    return (data.nodes || []).filter((node) => {
        if (node.type !== 'trigger') return false
        const props = node.properties || {}
        if ((props.triggerType || 'manual') !== triggerType) return false
        if (triggerType === 'event') return !props.eventName || props.eventName === eventName
        return true
    })
}

const matchCronPart = (part: string, value: number, min: number, max: number) => {
    const text = String(part || '*').trim()
    if (text === '*') return true
    if (text.startsWith('*/')) {
        const step = Number(text.slice(2))
        return Number.isFinite(step) && step > 0 && (value - min) % step === 0
    }
    return text.split(',').some((item) => {
        const n = Number(item.trim())
        return Number.isFinite(n) && n >= min && n <= max && n === value
    })
}

const cronMatches = (expression: string, date: Date) => {
    const parts = String(expression || '* * * * *')
        .trim()
        .split(/\s+/)
    if (parts.length !== 5) return false
    return (
        matchCronPart(parts[0], date.getMinutes(), 0, 59) &&
        matchCronPart(parts[1], date.getHours(), 0, 23) &&
        matchCronPart(parts[2], date.getDate(), 1, 31) &&
        matchCronPart(parts[3], date.getMonth() + 1, 1, 12) &&
        matchCronPart(parts[4], date.getDay(), 0, 6)
    )
}

const minuteKey = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`

const nextNodes = (data: WorkflowGraphRecord, sourceId: string, branch?: string) => {
    return (data.edges || [])
        .filter(
            (edge) =>
                edge.sourceNodeId === sourceId && (!branch || !edge.sourceAnchorId || edge.sourceAnchorId === branch),
        )
        .map((edge) => data.nodes.find((node) => node.id === edge.targetNodeId))
        .filter(Boolean) as WorkflowNodeRecord[]
}

const skipDownstreamNodes = (
    log: WorkflowRunRecord,
    data: WorkflowGraphRecord,
    sourceId: string,
    visited: Set<string>,
    message: string,
) => {
    const stack = nextNodes(data, sourceId)
    while (stack.length) {
        const node = stack.shift()!
        if (visited.has(node.id)) continue
        visited.add(node.id)
        const now = Date.now()
        log.nodes.push({
            id: node.id,
            type: node.type,
            status: 'skipped',
            message,
            startedAt: now,
            endedAt: now,
        })
        stack.push(...nextNodes(data, node.id))
    }
}

const runCommand = (command: string) => {
    return new Promise<string>((resolve, reject) => {
        exec(command, { timeout: 30_000 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message))
                return
            }
            resolve((stdout || stderr || '').trim())
        })
    })
}

const runJs = (code: string, outputType: string) => {
    const script = new Script(
        code ||
            `;(function () {
    return 'js result'
})()`,
    )
    const result = script.runInNewContext({}, { timeout: 5000 })
    return outputType === 'json' || outputType === 'any' ? result : String(result ?? '')
}

const getInputFieldValue = (props: WorkflowNodeRecord['properties'], name: string, fallback?: any) => {
    const field = (props?.inputFields || []).find((item) => item.name === name)
    if (!field) return fallback
    return field.value ?? field.defaultValue ?? fallback
}

const stringifyVariableValue = (value: any) => {
    if (value === undefined || value === null) return ''
    return String(value)
}

const resolveVariableToken = (token: string, context: Record<string, any>) => {
    if (token === 'lastOutput') return context.lastOutput
    const index = token.lastIndexOf('.')
    if (index <= 0) return context.variables?.[token]
    const nodeKey = token.slice(0, index)
    const fieldName = token.slice(index + 1)
    return context.nodeOutputs?.[nodeKey]?.[fieldName]
}

const resolveValue = (value: any, context: Record<string, any>): any => {
    if (typeof value === 'string') {
        const exact = value.match(/^\$\{([^}]+)\}$/)
        if (exact) {
            const resolved = resolveVariableToken(exact[1], context)
            return resolved === undefined ? value : resolved
        }
        return value.replace(/\$\{([^}]+)\}/g, (source, token) => {
            const resolved = resolveVariableToken(token, context)
            return resolved === undefined ? source : stringifyVariableValue(resolved)
        })
    }
    if (Array.isArray(value)) return value.map((item) => resolveValue(item, context))
    if (value && typeof value === 'object') {
        const result: Record<string, any> = {}
        Object.keys(value).forEach((key) => {
            result[key] = resolveValue(value[key], context)
        })
        return result
    }
    return value
}

const buildNodeOutputs = (node: WorkflowNodeRecord, output: any) => {
    const fields = node.properties?.outputFields || defaultNodeFields(node.type).outputFields
    const result: Record<string, any> = {}
    if (!fields.length) return result
    fields.forEach((field, index) => {
        if (output && typeof output === 'object' && !Array.isArray(output) && field.name in output) {
            result[field.name] = output[field.name]
        } else {
            result[field.name] = index === 0 ? output : undefined
        }
    })
    return result
}

const runLlm = async (props: Record<string, any>, context: Record<string, any>) => {
    const models = await listModels()
    const [providerId, modelId] = String(props.modelProvider || '|').split('|')
    const selected =
        models.find((item) => item.providerId === providerId && item.modelId === modelId) ||
        models.find((item) => item.providerId === props.providerId && item.modelId === props.modelId) ||
        models[0]
    if (!selected) throw new Error('ModelProviderNotConfigured')
    const prompt = String(
        resolveValue(props.prompt || getInputFieldValue(props, 'Prompt') || context.lastOutput || '', context),
    )
    const res = await modelChat(selected.providerId, selected.modelId, prompt)
    if (res.code) throw new Error(res.msg || 'ModelChatFailed')
    return res.data?.message || ''
}

const runPlugin = async (props: Record<string, any>) => {
    const pluginName = props.pluginName
    const toolName = props.toolName || props.actionName
    const mcpToolName = props.mcpToolName || (pluginName && toolName ? `${pluginName}-${toolName}` : '')
    if (!mcpToolName) return 'MCP 方法未配置，已跳过'
    const result = await PluginHttpMCP['tools/call']({
        name: mcpToolName,
        arguments: props.arguments || {},
    })
    return result
}

const runNode = async (node: WorkflowNodeRecord, context: Record<string, any>) => {
    const props = node.properties || {}
    if (node.type === 'trigger') return { output: `触发方式：${props.triggerType || 'manual'}` }
    if (node.type === 'command') {
        const command = resolveValue(props.command || getInputFieldValue(props, 'Command') || '', context)
        return { output: await runCommand(String(command)) }
    }
    if (node.type === 'js') {
        const resultField = (props.outputFields || []).find((item: WorkflowNodeFieldRecord) => item.name === 'Result')
        return { output: runJs(String(props.code || ''), props.outputType || resultField?.type || 'text') }
    }
    if (node.type === 'condition') {
        const left = String(
            resolveValue(props.leftValue ?? getInputFieldValue(props, 'Left') ?? context.lastOutput ?? '', context),
        )
        const right = String(resolveValue(props.rightValue ?? getInputFieldValue(props, 'Right') ?? '', context))
        const operator = props.operator || 'contains'
        const leftNumber = Number(left)
        const rightNumber = Number(right)
        const comparable = Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
        const passed =
            operator === 'equals' || operator === '='
                ? left === right
                : operator === 'notEquals' || operator === '!='
                  ? left !== right
                  : operator === 'greaterThan' || operator === '>'
                    ? comparable
                        ? leftNumber > rightNumber
                        : left > right
                    : operator === 'lessThan' || operator === '<'
                      ? comparable
                          ? leftNumber < rightNumber
                          : left < right
                      : operator === 'greaterThanOrEquals' || operator === '>='
                        ? comparable
                            ? leftNumber >= rightNumber
                            : left >= right
                        : operator === 'lessThanOrEquals' || operator === '<='
                          ? comparable
                              ? leftNumber <= rightNumber
                              : left <= right
                          : left.includes(right)
        return { output: passed, branch: passed ? 'true' : 'false' }
    }
    if (node.type === 'llm') return { output: await runLlm(props, context) }
    if (node.type === 'plugin')
        return { output: await runPlugin({ ...props, arguments: resolveValue(props.arguments || {}, context) }) }
    return { output: '' }
}

const runGraph = async (workflow: WorkflowRecord, triggerType: WorkflowTriggerType, eventName?: string) => {
    const log: WorkflowRunRecord = {
        id: createId('wfr'),
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'running',
        triggerType,
        eventName,
        startedAt: Date.now(),
        message: '',
        nodes: [],
    }
    validateGraph(workflow.data)
    const context: Record<string, any> = { eventName, nodeOutputs: {}, variables: {} }
    const visited = new Set<string>()
    const queue = getStartNodes(workflow.data, triggerType, eventName)
    if (!queue.length) throw new Error('TriggerNodeNotFound')
    try {
        while (queue.length) {
            const node = queue.shift()!
            if (visited.has(node.id)) continue
            visited.add(node.id)
            const item = {
                id: node.id,
                type: node.type,
                status: 'success' as const,
                message: '',
                startedAt: Date.now(),
                endedAt: Date.now(),
                output: undefined as any,
                outputs: undefined as any,
            }
            try {
                const result = await runNode(node, context)
                item.output = result.output
                item.outputs = buildNodeOutputs(node, result.output)
                item.endedAt = Date.now()
                context.lastOutput = result.output
                context.nodeOutputs[node.id] = item.outputs
                if (node.title) context.nodeOutputs[node.title] = item.outputs
                log.nodes.push(item)
                queue.push(...nextNodes(workflow.data, node.id, result.branch))
            } catch (e: any) {
                item.status = 'failed'
                item.message = e?.message || String(e)
                item.endedAt = Date.now()
                log.nodes.push(item)
                skipDownstreamNodes(log, workflow.data, node.id, visited, '上游节点失败，已跳过')
                throw e
            }
        }
        log.status = 'success'
        log.message = '执行成功'
    } catch (e: any) {
        log.status = 'failed'
        log.message = e?.message || String(e)
    } finally {
        log.endedAt = Date.now()
        await saveLog(log)
    }
    return log
}

const run = async (id: string, option?: { triggerType?: WorkflowTriggerType; eventName?: string }) => {
    const workflow = await get(id)
    if (!workflow) throw new Error('WorkflowNotFound')
    return await runGraph(workflow, option?.triggerType || 'manual', option?.eventName)
}

const emit = async (eventName: string) => {
    const records = (await list()).filter((record) => record.enabled)
    const logs: WorkflowRunRecord[] = []
    for (const record of records) {
        if (getStartNodes(record.data, 'event', eventName).length) {
            logs.push(await runGraph(record, 'event', eventName))
        }
    }
    return logs
}

const refreshTimers = async () => {
    timers.forEach((timer) => clearInterval(timer))
    timers.clear()
    timerLastRuns.clear()
    for (const record of await list()) {
        if (!record.enabled) continue
        const nodes = getStartNodes(record.data, 'timer')
        for (const node of nodes) {
            const key = `${record.id}:${node.id}`
            const expression = String(node.properties?.cronExpression || '* * * * *')
            timers.set(
                key,
                setInterval(() => {
                    const now = new Date()
                    const currentMinute = minuteKey(now)
                    if (
                        now.getSeconds() > 1 ||
                        timerLastRuns.get(key) === currentMinute ||
                        !cronMatches(expression, now)
                    )
                        return
                    timerLastRuns.set(key, currentMinute)
                    runGraph(record, 'timer').then()
                }, 1000),
            )
        }
    }
}

const destroy = () => {
    timers.forEach((timer) => clearInterval(timer))
    timers.clear()
    timerLastRuns.clear()
}

ipcMain.handle('workflow:list', async () => list())
ipcMain.handle('workflow:get', async (_, id: string) => get(id))
ipcMain.handle('workflow:insert', async (_, payload: Partial<WorkflowRecord>) => insert(payload))
ipcMain.handle('workflow:update', async (_, payload: Partial<WorkflowRecord> & { id: string }) => update(payload))
ipcMain.handle('workflow:delete', async (_, id: string) => remove(id))
ipcMain.handle(
    'workflow:run',
    async (_, id: string, option?: { triggerType?: WorkflowTriggerType; eventName?: string }) => run(id, option),
)
ipcMain.handle('workflow:emit', async (_, eventName: string) => emit(eventName))
ipcMain.handle('workflow:listLog', async () => listLog())
ipcMain.handle('workflow:listModels', async () => listModels())

export default {
    list,
    get,
    insert,
    update,
    delete: remove,
    run,
    emit,
    listLog,
    listModels,
    init: refreshTimers,
    destroy,
}
