import { computed, onMounted, onUnmounted, ref } from 'vue'
import { testActionSet, testActionUnset } from '../../utils/test'
import { defaultWorkflowNodeProperties, workflowNodeFieldDefinitions, workflowNodeTypes } from './config'
import { WorkflowEdge, WorkflowNode, WorkflowNodeType } from './types'
import { t } from '../../lang'

export const useWorkflowPage = () => {
    const workflows = ref<any[]>([])
    const logs = ref<any[]>([])
    const currentId = ref('')
    const viewMode = ref<'list' | 'edit' | 'history'>('list')
    const historyWorkflowId = ref('')
    const name = ref('自动化工作流')
    const selectedNodeId = ref('')
    const running = ref(false)
    const runningWorkflowIds = ref<string[]>([])
    const nodes = ref<WorkflowNode[]>([])
    const edges = ref<WorkflowEdge[]>([])

    const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) || null)

    const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    const clonePlain = (value: any): any => {
        if (Array.isArray(value)) return value.map((item) => clonePlain(item))
        if (value && typeof value === 'object') {
            const result: Record<string, any> = {}
            for (const key in value) result[key] = clonePlain(value[key])
            return result
        }
        return value
    }

    const normalizeNode = (node: WorkflowNode): WorkflowNode => {
        const defaults = workflowNodeFieldDefinitions(node.type)
        const properties = clonePlain(node.properties || {})
        if (node.type === 'command' && !properties.command) {
            const commandField = (properties.inputFields || []).find((item: any) => item.name === 'Command')
            if (commandField?.value) properties.command = commandField.value
        }
        properties.inputFields =
            node.type === 'command' || node.type === 'js' || node.type === 'condition' || node.type === 'llm'
                ? []
                : properties.inputFields || defaults.inputFields
        properties.outputFields =
            node.type === 'trigger' || node.type === 'command' || node.type === 'condition'
                ? []
                : properties.outputFields || defaults.outputFields
        return { ...node, properties }
    }

    const toData = () => ({
        nodes: nodes.value.map((node) => ({
            id: node.id,
            type: node.type,
            title: node.title,
            x: node.x,
            y: node.y,
            properties: normalizeNode(node).properties,
        })),
        edges: edges.value.map((edge) => ({ ...edge })),
    })

    const toState = () => ({
        workflows: workflows.value.map((workflow) => ({
            ...workflow,
            data: {
                nodes: (workflow.data?.nodes || []).map((node: WorkflowNode) => ({
                    ...node,
                    properties: normalizeNode(node).properties,
                })),
                edges: (workflow.data?.edges || []).map((edge: WorkflowEdge) => ({ ...edge })),
            },
        })),
        logs: logs.value.map((log) => ({
            ...log,
            nodes: (log.nodes || []).map((node: any) => ({ ...node })),
        })),
        nodes: toData().nodes,
        edges: toData().edges,
        viewMode: viewMode.value,
        currentId: currentId.value,
        historyWorkflowId: historyWorkflowId.value,
        selectedNodeId: selectedNodeId.value,
        runningWorkflowIds: [...runningWorkflowIds.value],
    })

    const loadWorkflow = (workflow: any) => {
        currentId.value = workflow.id
        name.value = workflow.name
        nodes.value = (workflow.data?.nodes || []).map((node: WorkflowNode) => normalizeNode(node))
        edges.value = workflow.data?.edges || []
        selectedNodeId.value = nodes.value[0]?.id || ''
    }

    const openWorkflowEditor = (workflow: any) => {
        loadWorkflow(workflow)
        viewMode.value = 'edit'
    }

    const backToList = async () => {
        viewMode.value = 'list'
        await loadList()
    }

    const openWorkflowHistory = async (workflow: any) => {
        historyWorkflowId.value = workflow.id
        currentId.value = workflow.id
        viewMode.value = 'history'
        logs.value = await window.$mapi.workflow.listLog()
    }

    const loadList = async () => {
        workflows.value = await window.$mapi.workflow.list()
        logs.value = await window.$mapi.workflow.listLog()
        if (!currentId.value && workflows.value.length) loadWorkflow(workflows.value[0])
    }

    const newWorkflow = async () => {
        const graphNodes: WorkflowNode[] = [
            {
                id: createId('node'),
                type: 'trigger',
                title: '手动触发',
                x: 560,
                y: 80,
                properties: defaultWorkflowNodeProperties('trigger'),
            },
        ]
        const record = await window.$mapi.workflow.insert({
            name: '自动化工作流',
            data: { nodes: graphNodes, edges: [] },
        })
        await loadList()
        loadWorkflow(record)
        viewMode.value = 'edit'
        return record
    }

    const saveWorkflow = async () => {
        if (!currentId.value) {
            const record = await window.$mapi.workflow.insert({ name: name.value, data: toData() })
            currentId.value = record.id
        } else {
            await window.$mapi.workflow.update({ id: currentId.value, name: name.value, data: toData() })
        }
        await loadList()
    }

    const deleteWorkflow = async () => {
        if (!currentId.value) return
        await window.$mapi.workflow.delete(currentId.value)
        currentId.value = ''
        nodes.value = []
        edges.value = []
        viewMode.value = 'list'
        await loadList()
    }

    const deleteWorkflowRecord = async (workflow: any) => {
        await window.$mapi.workflow.delete(workflow.id)
        if (currentId.value === workflow.id) {
            currentId.value = ''
            nodes.value = []
            edges.value = []
        }
        await loadList()
    }

    const runWorkflowRecord = async (workflow: any) => {
        loadWorkflow(workflow)
        running.value = true
        runningWorkflowIds.value = Array.from(new Set([...runningWorkflowIds.value, workflow.id]))
        try {
            const result = await window.$mapi.workflow.run(workflow.id, { triggerType: 'manual' })
            logs.value = await window.$mapi.workflow.listLog()
            return result
        } finally {
            running.value = false
            runningWorkflowIds.value = runningWorkflowIds.value.filter((id) => id !== workflow.id)
        }
    }

    const copyWorkflowRecord = (workflow: any) => {
        const copiedNodes = (workflow.data?.nodes || []).map((node: WorkflowNode) => ({
            ...node,
            id: createId('node'),
            properties: normalizeNode(node).properties,
        }))
        const idMap = new Map<string, string>()
        ;(workflow.data?.nodes || []).forEach((node: WorkflowNode, index: number) => {
            idMap.set(node.id, copiedNodes[index].id)
        })
        currentId.value = ''
        name.value = `${workflow.name}${t('副本')}`
        nodes.value = copiedNodes
        edges.value = (workflow.data?.edges || []).map((edge: WorkflowEdge) => ({
            ...edge,
            sourceNodeId: idMap.get(edge.sourceNodeId) || edge.sourceNodeId,
            targetNodeId: idMap.get(edge.targetNodeId) || edge.targetNodeId,
        }))
        selectedNodeId.value = nodes.value[0]?.id || ''
        viewMode.value = 'edit'
    }

    const addNode = (type: WorkflowNodeType, position?: { x: number; y: number }) => {
        if (type === 'trigger' && nodes.value.some((node) => node.type === 'trigger')) return
        const last = nodes.value[nodes.value.length - 1]
        const node: WorkflowNode = {
            id: createId('node'),
            type,
            title: workflowNodeTypes.find((item) => item.type === type)?.title || t('节点'),
            x: position?.x ?? (last ? last.x : 560),
            y: position?.y ?? (last ? last.y + 130 : 80),
            properties: defaultWorkflowNodeProperties(type),
        }
        nodes.value.push(node)
        selectedNodeId.value = node.id
    }

    const removeNode = () => {
        if (!selectedNodeId.value) return
        const node = nodes.value.find((item) => item.id === selectedNodeId.value)
        if (node?.type === 'trigger' && nodes.value.filter((item) => item.type === 'trigger').length <= 1) return
        nodes.value = nodes.value.filter((node) => node.id !== selectedNodeId.value)
        edges.value = edges.value.filter(
            (edge) => edge.sourceNodeId !== selectedNodeId.value && edge.targetNodeId !== selectedNodeId.value,
        )
        selectedNodeId.value = nodes.value[0]?.id || ''
    }

    const moveNode = (id: string, x: number, y: number) => {
        const node = nodes.value.find((item) => item.id === id)
        if (!node) return
        node.x = Math.max(180, Math.round(x))
        node.y = Math.max(24, Math.round(y))
    }

    const replaceGraph = (nextNodes: WorkflowNode[], nextEdges: WorkflowEdge[]) => {
        const seenTrigger = { value: false }
        nodes.value = nextNodes
            .filter((node) => {
                if (node.type !== 'trigger') return true
                if (seenTrigger.value) return false
                seenTrigger.value = true
                return true
            })
            .map((node) => ({
                ...node,
                properties: normalizeNode(node).properties,
            }))
        edges.value = nextEdges
            .filter((edge) => nodes.value.find((node) => node.id === edge.targetNodeId)?.type !== 'trigger')
            .map((edge) => ({ ...edge }))
        if (selectedNodeId.value && !nodes.value.some((node) => node.id === selectedNodeId.value)) {
            selectedNodeId.value = nodes.value[0]?.id || ''
        }
    }

    const connectTo = (targetId: string) => {
        if (!selectedNodeId.value || selectedNodeId.value === targetId) return
        connectNodes(selectedNodeId.value, targetId)
    }

    const connectNodes = (sourceId: string, targetId: string, sourceAnchorId?: string) => {
        if (!sourceId || sourceId === targetId) return
        if (nodes.value.find((node) => node.id === targetId)?.type === 'trigger') return
        if (edges.value.some((edge) => edge.sourceNodeId === sourceId && edge.targetNodeId === targetId)) return
        edges.value.push({ sourceNodeId: sourceId, targetNodeId: targetId, sourceAnchorId })
    }

    const runWorkflow = async (triggerType = 'manual', eventName?: string) => {
        if (!currentId.value) await saveWorkflow()
        running.value = true
        try {
            await saveWorkflow()
            const result = await window.$mapi.workflow.run(currentId.value, { triggerType, eventName })
            logs.value = await window.$mapi.workflow.listLog()
            return result
        } finally {
            running.value = false
        }
    }

    const emitEvent = async () => {
        await saveWorkflow()
        const result = await window.$mapi.workflow.emit('demo.event')
        logs.value = await window.$mapi.workflow.listLog()
        return result
    }

    const refreshLogs = async () => {
        logs.value = await window.$mapi.workflow.listLog()
        return logs.value
    }

    const getDefaultModelProvider = async () => {
        const models = await window.$mapi.workflow.listModels()
        const model = models[0]
        return model ? `${model.providerId}|${model.modelId}` : ''
    }

    const openSeedWorkflow = async (workflowId: string, workflowName: string) => {
        await loadList()
        const record = workflows.value.find((workflow) => workflow.id === workflowId || workflow.name === workflowName)
        if (!record) return null
        const normalized = { ...record, id: record.id || record._id || workflowId }
        loadWorkflow(normalized)
        viewMode.value = 'edit'
        return normalized
    }

    const seedAllNodesWorkflow = async () => {
        const seeded = await openSeedWorkflow('demo_all_nodes', '覆盖全部节点测试')
        if (seeded) return seeded
        const modelProvider = await getDefaultModelProvider()
        const graphNodes: WorkflowNode[] = [
            {
                id: 'trigger_manual',
                type: 'trigger',
                title: '手动触发',
                x: 560,
                y: 70,
                properties: { triggerType: 'manual' },
            },
            { id: 'cmd_pwd', type: 'command', title: '生成评估报告', x: 560, y: 200, properties: { command: 'pwd' } },
            {
                id: 'js_result',
                type: 'js',
                title: '执行JS结果',
                x: 560,
                y: 330,
                properties: {
                    code: `;(function () {
    return 'js result'
})()`,
                    outputType: 'text',
                    outputFields: [{ name: 'Result', title: '执行结果', type: 'text' }],
                },
            },
            {
                id: 'condition_ok',
                type: 'condition',
                title: '评估是否通过',
                x: 560,
                y: 460,
                properties: { leftValue: '${执行JS结果.Result}', operator: 'contains', rightValue: 'js result' },
            },
            {
                id: 'llm_summary',
                type: 'llm',
                title: '归档评估报告',
                x: 370,
                y: 630,
                properties: { modelProvider, prompt: '用两个字回复：通过。结果：${执行JS结果.Result}' },
            },
            {
                id: 'plugin_workflow',
                type: 'plugin',
                title: '调用参数类型插件',
                x: 750,
                y: 630,
                properties: {
                    mcpToolName: 'BasicExample-ParamTypes',
                    pluginName: 'BasicExample',
                    toolName: 'ParamTypes',
                    arguments: {
                        text: '归档：${归档评估报告.Content}',
                        count: 3,
                        temperature: 26.5,
                        enabled: true,
                        mode: '标准',
                        tags: ['workflow', 'mcp'],
                        profile: { name: '演示对象', level: 1, active: true },
                    },
                },
            },
        ]
        const graphEdges: WorkflowEdge[] = [
            { sourceNodeId: 'trigger_manual', targetNodeId: 'cmd_pwd' },
            { sourceNodeId: 'cmd_pwd', targetNodeId: 'js_result' },
            { sourceNodeId: 'js_result', targetNodeId: 'condition_ok' },
            { sourceNodeId: 'condition_ok', targetNodeId: 'llm_summary', sourceAnchorId: 'true' },
            { sourceNodeId: 'llm_summary', targetNodeId: 'plugin_workflow' },
        ]
        const record = await window.$mapi.workflow.insert({
            name: '覆盖全部节点测试',
            data: { nodes: graphNodes, edges: graphEdges },
        })
        await loadList()
        loadWorkflow(record)
        viewMode.value = 'edit'
        return record
    }

    const seedCronWorkflow = async () => {
        const seeded = await openSeedWorkflow('demo_timer', '一分钟定时测试')
        if (seeded) return seeded
        const graphNodes: WorkflowNode[] = [
            {
                id: 'trigger_cron_1m',
                type: 'trigger',
                title: '每分钟触发',
                x: 420,
                y: 120,
                properties: { triggerType: 'timer', cronExpression: '* * * * *' },
            },
            {
                id: 'cmd_timer_ok',
                type: 'command',
                title: '输出定时结果',
                x: 420,
                y: 250,
                properties: { command: 'echo timer-ok' },
            },
        ]
        const record = await window.$mapi.workflow.insert({
            name: '一分钟定时测试',
            data: { nodes: graphNodes, edges: [{ sourceNodeId: graphNodes[0].id, targetNodeId: graphNodes[1].id }] },
        })
        await loadList()
        loadWorkflow(record)
        viewMode.value = 'edit'
        return record
    }

    const seedEventWorkflow = async () => {
        const seeded = await openSeedWorkflow('demo_event', '事件触发测试')
        if (seeded) return seeded
        const graphNodes: WorkflowNode[] = [
            {
                id: 'trigger_event',
                type: 'trigger',
                title: '事件触发',
                x: 420,
                y: 120,
                properties: { triggerType: 'event', eventName: 'demo.event' },
            },
            {
                id: 'cmd_event_ok',
                type: 'command',
                title: '输出事件结果',
                x: 420,
                y: 250,
                properties: { command: 'echo event-ok' },
            },
        ]
        const record = await window.$mapi.workflow.insert({
            name: '事件触发测试',
            data: { nodes: graphNodes, edges: [{ sourceNodeId: graphNodes[0].id, targetNodeId: graphNodes[1].id }] },
        })
        await loadList()
        loadWorkflow(record)
        viewMode.value = 'edit'
        return record
    }

    const seedFailingEventWorkflow = async () => {
        const seeded = await openSeedWorkflow('demo_event_fail', '事件失败下游跳过测试')
        if (seeded) return seeded
        const modelProvider = await getDefaultModelProvider()
        const graphNodes: WorkflowNode[] = [
            {
                id: 'trigger_event_fail',
                type: 'trigger',
                title: '事件触发失败',
                x: 480,
                y: 80,
                properties: { triggerType: 'event', eventName: 'demo.fail' },
            },
            {
                id: 'cmd_event_fail',
                type: 'command',
                title: '失败命令',
                x: 480,
                y: 220,
                properties: { command: 'false' },
            },
            {
                id: 'llm_after_fail',
                type: 'llm',
                title: '失败后总结',
                x: 480,
                y: 360,
                properties: { modelProvider, prompt: '不应执行' },
            },
            {
                id: 'plugin_after_fail',
                type: 'plugin',
                title: '失败后通知',
                x: 480,
                y: 500,
                properties: {
                    mcpToolName: 'BasicExample-GetWeather',
                    pluginName: 'BasicExample',
                    toolName: 'GetWeather',
                    arguments: { city: '杭州' },
                },
            },
        ]
        const graphEdges: WorkflowEdge[] = [
            { sourceNodeId: 'trigger_event_fail', targetNodeId: 'cmd_event_fail' },
            { sourceNodeId: 'cmd_event_fail', targetNodeId: 'llm_after_fail' },
            { sourceNodeId: 'llm_after_fail', targetNodeId: 'plugin_after_fail' },
        ]
        const record = await window.$mapi.workflow.insert({
            name: '事件失败下游跳过测试',
            data: { nodes: graphNodes, edges: graphEdges },
        })
        await loadList()
        loadWorkflow(record)
        viewMode.value = 'edit'
        return record
    }

    onMounted(async () => {
        await loadList()
        testActionSet('pageWorkflow.loaded', () => viewMode.value)
        testActionSet('pageWorkflow.switchTab', (value: string) => {
            viewMode.value = value === 'edit' ? 'edit' : 'list'
        })
        testActionSet('pageWorkflow.backToList', backToList)
        testActionSet('pageWorkflow.openHistory', () => {
            const workflow = workflows.value.find((item) => logs.value.some((log) => log.workflowId === item.id))
            return openWorkflowHistory(workflow || workflows.value[0])
        })
        testActionSet('pageWorkflow.copyFirst', () => copyWorkflowRecord(workflows.value[0]))
        testActionSet('pageWorkflow.markFirstRunning', () => {
            const workflow = workflows.value[0]
            runningWorkflowIds.value = workflow ? [workflow.id] : []
            return runningWorkflowIds.value
        })
        testActionSet('pageWorkflow.save', saveWorkflow)
        testActionSet('pageWorkflow.newWorkflow', newWorkflow)
        testActionSet('pageWorkflow.seedAllNodesWorkflow', seedAllNodesWorkflow)
        testActionSet('pageWorkflow.seedCronWorkflow', seedCronWorkflow)
        testActionSet('pageWorkflow.seedEventWorkflow', seedEventWorkflow)
        testActionSet('pageWorkflow.seedFailingEventWorkflow', seedFailingEventWorkflow)
        testActionSet('pageWorkflow.runManual', () => runWorkflow('manual'))
        testActionSet('pageWorkflow.runTimer', () => runWorkflow('timer'))
        testActionSet('pageWorkflow.runFailingEvent', () => runWorkflow('event', 'demo.fail'))
        testActionSet('pageWorkflow.emitEvent', emitEvent)
        testActionSet('pageWorkflow.refreshLogs', refreshLogs)
        testActionSet('pageWorkflow.selectNode', (id: string) => {
            selectedNodeId.value = id
            return selectedNode.value
        })
        testActionSet('pageWorkflow.setSelectedTriggerType', (triggerType: string) => {
            if (!selectedNode.value || selectedNode.value.type !== 'trigger') return null
            selectedNode.value.properties.triggerType = triggerType
            return selectedNode.value
        })
        testActionSet('pageWorkflow.setSelectedModelProvider', (modelProvider: string) => {
            if (!selectedNode.value || selectedNode.value.type !== 'llm') return null
            selectedNode.value.properties.modelProvider = modelProvider
            const [providerId, modelId] = modelProvider.split('|')
            selectedNode.value.properties.providerId = providerId || ''
            selectedNode.value.properties.modelId = modelId || ''
            return selectedNode.value
        })
        testActionSet('pageWorkflow.addSecondTrigger', () => {
            const before = nodes.value.filter((node) => node.type === 'trigger').length
            addNode('trigger')
            const after = nodes.value.filter((node) => node.type === 'trigger').length
            return { before, after }
        })
        testActionSet('pageWorkflow.moveFirstNode', () => {
            const node = nodes.value[0]
            if (!node) return null
            moveNode(node.id, node.x + 80, node.y + 45)
            return { id: node.id, x: node.x, y: node.y }
        })
        testActionSet('pageWorkflow.connectFirstToLast', () => {
            let source: WorkflowNode | null = null
            let target: WorkflowNode | null = null
            for (const sourceNode of nodes.value) {
                const targetNode = nodes.value.find(
                    (node) =>
                        node.id !== sourceNode.id &&
                        !edges.value.some(
                            (edge) => edge.sourceNodeId === sourceNode.id && edge.targetNodeId === node.id,
                        ),
                )
                if (targetNode) {
                    source = sourceNode
                    target = targetNode
                    break
                }
            }
            if (!source || !target) return null
            connectNodes(source.id, target.id)
            return edges.value.find((edge) => edge.sourceNodeId === source.id && edge.targetNodeId === target.id)
        })
        testActionSet('pageWorkflow.connectCommandToTrigger', () => {
            const source = nodes.value.find((node) => node.type === 'command')
            const target = nodes.value.find((node) => node.type === 'trigger')
            if (!source || !target) return null
            const before = edges.value.length
            connectNodes(source.id, target.id)
            return { before, after: edges.value.length }
        })
        testActionSet('pageWorkflow.getState', toState)
    })

    onUnmounted(() => {
        testActionUnset([
            'pageWorkflow.loaded',
            'pageWorkflow.switchTab',
            'pageWorkflow.backToList',
            'pageWorkflow.openHistory',
            'pageWorkflow.copyFirst',
            'pageWorkflow.markFirstRunning',
            'pageWorkflow.save',
            'pageWorkflow.newWorkflow',
            'pageWorkflow.seedAllNodesWorkflow',
            'pageWorkflow.seedCronWorkflow',
            'pageWorkflow.seedEventWorkflow',
            'pageWorkflow.seedFailingEventWorkflow',
            'pageWorkflow.runManual',
            'pageWorkflow.runTimer',
            'pageWorkflow.runFailingEvent',
            'pageWorkflow.emitEvent',
            'pageWorkflow.refreshLogs',
            'pageWorkflow.selectNode',
            'pageWorkflow.setSelectedTriggerType',
            'pageWorkflow.setSelectedModelProvider',
            'pageWorkflow.addSecondTrigger',
            'pageWorkflow.moveFirstNode',
            'pageWorkflow.connectFirstToLast',
            'pageWorkflow.connectCommandToTrigger',
            'pageWorkflow.getState',
        ])
    })

    return {
        workflows,
        logs,
        currentId,
        name,
        selectedNodeId,
        running,
        runningWorkflowIds,
        nodes,
        edges,
        selectedNode,
        viewMode,
        historyWorkflowId,
        newWorkflow,
        saveWorkflow,
        deleteWorkflow,
        deleteWorkflowRecord,
        runWorkflowRecord,
        copyWorkflowRecord,
        addNode,
        moveNode,
        removeNode,
        connectTo,
        connectNodes,
        replaceGraph,
        runWorkflow,
        emitEvent,
        loadWorkflow,
        openWorkflowEditor,
        backToList,
        openWorkflowHistory,
    }
}
