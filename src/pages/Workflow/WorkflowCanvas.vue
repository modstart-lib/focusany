<script setup lang="ts">
import LogicFlow, { RectNode, RectNodeModel, h } from '@logicflow/core'
import '@logicflow/core/dist/index.css'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { workflowNodeTypes } from './config'
import { WorkflowEdge, WorkflowNode, WorkflowNodeType } from './types'
import { iconText, nodeTypeTitle } from './Node'
import { testActionSet, testActionUnset } from '../../utils/test'

const { t } = useI18n()

const props = withDefaults(
    defineProps<{
        nodes: WorkflowNode[]
        edges: WorkflowEdge[]
        selectedNodeId: string
        readonly?: boolean
        toolbar?: boolean
        maxFitZoom?: number
    }>(),
    {
        readonly: false,
        toolbar: true,
        maxFitZoom: 1,
    },
)

const emit = defineEmits<{
    addNode: [type: WorkflowNodeType, position?: { x: number; y: number }]
    connectNodes: [sourceId: string, targetId: string, sourceAnchorId?: string]
    graphChange: [nodes: WorkflowNode[], edges: WorkflowEdge[]]
    moveNode: [id: string, x: number, y: number]
    'update:selectedNodeId': [id: string]
}>()

const canvasRef = ref<HTMLElement | null>(null)
const nodePickerVisible = ref(false)
let lf: LogicFlow | null = null
let rendering = false
let syncingFromLogicFlow = false
let skipNextGraphRender = false
let fitted = false

const nodeWidth = 220
const nodeHeight = 64
const fitZoomMax = () => props.maxFitZoom

const getTransformState = () => {
    const transformModel = (lf as any)?.graphModel?.transformModel
    if (!transformModel) return null
    return {
        scaleX: transformModel.SCALE_X,
        scaleY: transformModel.SCALE_Y,
        translateX: transformModel.TRANSLATE_X,
        translateY: transformModel.TRANSLATE_Y,
    }
}

const selectNode = (id: string) => {
    emit('update:selectedNodeId', id)
}

const fitGraph = () => {
    if (!lf) return
    lf.setZoomMaxSize(fitZoomMax())

    const lfAny = lf as any
    const graphModel = lfAny.graphModel
    const transformModel = graphModel?.transformModel
    const container = canvasRef.value
    if (!graphModel || !transformModel || !container) {
        lf.fitView()
        return
    }

    const viewportW = graphModel.width || container.clientWidth
    const viewportH = graphModel.height || container.clientHeight
    if (!viewportW || !viewportH) {
        lf.fitView()
        return
    }

    const nodes = graphModel.nodes
    if (!nodes || !nodes.length) {
        lf.fitView()
        return
    }

    // Calculate content bounding box from all nodes
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const node of nodes) {
        const strokeW = node.getNodeStyle?.()?.strokeWidth || 0
        const l = node.x - node.width / 2 - strokeW
        const r = node.x + node.width / 2 + strokeW
        const t = node.y - node.height / 2 - strokeW
        const b = node.y + node.height / 2 + strokeW
        if (!Number.isNaN(l)) {
            minX = Math.min(minX, l)
            maxX = Math.max(maxX, r)
        }
        if (!Number.isNaN(t)) {
            minY = Math.min(minY, t)
            maxY = Math.max(maxY, b)
        }
    }
    if (minX === Infinity) return

    const contentW = maxX - minX
    const contentH = maxY - minY
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // Calculate zoom to fit content into viewport with padding
    const pad = 40
    const scaleX = (contentW + pad) / viewportW
    const scaleY = (contentH + pad) / viewportH
    let zoom = 1 / Math.max(scaleX, scaleY)

    // Cap zoom to prevent zooming in beyond the specified limit
    const maxZoom = fitZoomMax()
    if (zoom > maxZoom) zoom = maxZoom

    // Reset transform to identity, then apply zoom and centering
    transformModel.SCALE_X = 1
    transformModel.SCALE_Y = 1
    transformModel.TRANSLATE_X = 0
    transformModel.TRANSLATE_Y = 0

    // Apply zoom from viewport center
    transformModel.zoom(zoom, [viewportW / 2, viewportH / 2])

    // Center content in viewport
    const htmlPoint = transformModel.CanvasPointToHtmlPoint([centerX, centerY])
    transformModel.TRANSLATE_X += viewportW / 2 - htmlPoint[0]
    transformModel.TRANSLATE_Y += viewportH / 2 - htmlPoint[1]

    transformModel.emitGraphTransform?.('fitView')
}

const fitGraphOnce = () => {
    if (fitted || !props.nodes.length) return
    fitted = true
    const doFit = () => {
        const container = canvasRef.value
        if (container && (container.clientWidth === 0 || container.clientHeight === 0)) {
            setTimeout(doFit, 80)
            return
        }
        fitGraph()
    }
    setTimeout(doFit, 0)
}

const getCanvasCenterPosition = () => {
    const rect = canvasRef.value?.getBoundingClientRect()
    if (!lf || !rect) return undefined
    const position = (lf as any).getPointByClient(rect.left + rect.width / 2, rect.top + rect.height / 2)
    const point = position?.canvasOverlayPosition || position?.domOverlayPosition
    if (!point) return undefined
    return {
        x: Math.round(point.x - nodeWidth / 2),
        y: Math.round(point.y - nodeHeight / 2),
    }
}

const chooseNodeType = (type: WorkflowNodeType) => {
    emit('addNode', type, getCanvasCenterPosition())
    nodePickerVisible.value = false
}

class WorkflowLogicNodeModel extends RectNodeModel {
    setAttributes() {
        super.setAttributes()
        this.width = nodeWidth
        this.height = nodeHeight
        this.radius = 10
    }

    getDefaultAnchor() {
        const { x, y, width } = this
        const workflowType = (this.properties as any)?.workflowType
        const anchors =
            workflowType === 'condition'
                ? [
                      { x: x + width / 2, y: y - 14, id: 'true', type: 'right' },
                      { x: x + width / 2, y: y + 14, id: 'false', type: 'right' },
                  ]
                : [{ x: x + width / 2, y, id: 'out', type: 'right' }]
        if (workflowType !== 'trigger') {
            anchors.unshift({ x: x - width / 2, y, id: 'in', type: 'left' })
        }
        return anchors
    }

    getAnchorStyle() {
        return {
            r: 5,
            fill: '#fff',
            stroke: '#2563eb',
            strokeWidth: 1.5,
            hover: { r: 6, fill: '#2563eb' },
        }
    }

    getConnectedSourceRules() {
        const rules = super.getConnectedSourceRules()
        rules.push({
            message: t('workflow.sourceOnlyRule'),
            validate: (_sourceNode: any, _targetNode: any, sourceAnchor: any) => sourceAnchor?.id !== 'in',
        })
        return rules
    }

    getConnectedTargetRules() {
        const rules = super.getConnectedTargetRules()
        rules.push({
            message: t('workflow.targetOnlyRule'),
            validate: (_sourceNode: any, _targetNode: any, _sourceAnchor: any, targetAnchor: any) =>
                targetAnchor?.id === 'in',
        })
        rules.push({
            message: t('workflow.triggerAsStartRule'),
            validate: (_sourceNode: any, targetNode: any) => targetNode?.properties?.workflowType !== 'trigger',
        })
        return rules
    }
}

class WorkflowLogicNode extends RectNode {
    getShape() {
        const { model } = this.props
        const properties = model.getProperties() as any
        const workflowType = (properties.workflowType || 'command') as WorkflowNodeType
        const title = properties.title || model.text?.value || t('workflow.nodeFallback')
        const selected = model.isSelected
        const borderColor = selected ? '#2563eb' : '#e5e7eb'
        const branchLabels =
            workflowType === 'condition'
                ? [
                      h(
                          'text',
                          {
                              x: model.x + nodeWidth / 2 - 34,
                              y: model.y - 10,
                              fill: '#64748b',
                              fontSize: 11,
                              fontWeight: 700,
                              textAnchor: 'start',
                          },
                          t('common.yes'),
                      ),
                      h(
                          'text',
                          {
                              x: model.x + nodeWidth / 2 - 34,
                              y: model.y + 18,
                              fill: '#64748b',
                              fontSize: 11,
                              fontWeight: 700,
                              textAnchor: 'start',
                          },
                          t('common.no'),
                      ),
                  ]
                : []
        return h('g', { 'data-testid': 'workflow-node', 'data-node-id': model.id }, [
            h('rect', {
                x: model.x - nodeWidth / 2,
                y: model.y - nodeHeight / 2,
                width: nodeWidth,
                height: nodeHeight,
                rx: 10,
                ry: 10,
                fill: '#fff',
                stroke: borderColor,
                strokeWidth: selected ? 2 : 1,
                filter: 'drop-shadow(0 8px 16px rgba(15, 23, 42, 0.06))',
            }),
            h('rect', {
                x: model.x - nodeWidth / 2 + 14,
                y: model.y - 18,
                width: 36,
                height: 36,
                rx: 8,
                fill: '#f8fafc',
                stroke: '#e5e7eb',
            }),
            h(
                'text',
                {
                    x: model.x - nodeWidth / 2 + 32,
                    y: model.y + 5,
                    fill: '#475569',
                    fontSize: 12,
                    fontWeight: 700,
                    textAnchor: 'middle',
                },
                iconText(workflowType),
            ),
            h(
                'text',
                {
                    x: model.x - nodeWidth / 2 + 64,
                    y: model.y + 5,
                    fill: '#1e293b',
                    fontSize: 15,
                    fontWeight: 700,
                    textAnchor: 'start',
                },
                title.length > 12 ? `${title.slice(0, 12)}...` : title,
            ),
            ...branchLabels,
        ])
    }
}

const toLogicFlowData = () => ({
    nodes: props.nodes.map((node) => ({
        id: node.id,
        type: 'workflow-node',
        x: node.x + nodeWidth / 2,
        y: node.y + nodeHeight / 2,
        text: { value: '', x: node.x + nodeWidth / 2, y: node.y + nodeHeight / 2 },
        properties: {
            ...node.properties,
            title: node.title,
            workflowType: node.type,
        },
    })),
    edges: props.edges.map((edge, index) => ({
        id: `${edge.sourceNodeId}_${edge.targetNodeId}_${edge.sourceAnchorId || 'out'}_${index}`,
        type: 'bezier',
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        sourceAnchorId: edge.sourceAnchorId || 'out',
        targetAnchorId: 'in',
        properties: {
            sourceAnchorId: edge.sourceAnchorId,
        },
        text: edge.sourceAnchorId ? (edge.sourceAnchorId === 'true' ? t('common.yes') : t('common.no')) : undefined,
    })),
})

const fromLogicFlowData = () => {
    const data = lf?.getGraphData() as any
    const nodes: WorkflowNode[] = (data?.nodes || []).map((node: any) => {
        const properties = { ...(node.properties || {}) }
        const workflowType = (properties.workflowType || 'command') as WorkflowNodeType
        const title = properties.title || node.text?.value || t('workflow.nodeFallback')
        delete properties.workflowType
        delete properties.title
        return {
            id: node.id,
            type: workflowType,
            title,
            x: Math.round((node.x || 0) - nodeWidth / 2),
            y: Math.round((node.y || 0) - nodeHeight / 2),
            properties,
        }
    })
    const edges: WorkflowEdge[] = (data?.edges || []).map((edge: any) => ({
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        sourceAnchorId:
            edge.properties?.sourceAnchorId ||
            (edge.sourceAnchorId && edge.sourceAnchorId !== 'out' ? edge.sourceAnchorId : undefined),
    }))
    return { nodes, edges }
}

const syncGraph = () => {
    if (!lf || rendering || props.readonly) return
    const graph = fromLogicFlowData()
    syncingFromLogicFlow = true
    skipNextGraphRender = true
    emit('graphChange', graph.nodes, graph.edges)
    setTimeout(() => {
        syncingFromLogicFlow = false
        skipNextGraphRender = false
    }, 200)
}

const renderGraph = () => {
    if (!lf || syncingFromLogicFlow) return
    rendering = true
    lf.render(toLogicFlowData())
    if (props.selectedNodeId) lf.selectElementById(props.selectedNodeId, false, true)
    fitGraphOnce()
    setTimeout(() => {
        rendering = false
    }, 0)
}

onMounted(() => {
    testActionSet('pageWorkflow.openNodePicker', () => {
        nodePickerVisible.value = true
        return nodePickerVisible.value
    })
    testActionSet('pageWorkflow.closeNodePicker', () => {
        nodePickerVisible.value = false
        return nodePickerVisible.value
    })
    testActionSet('pageWorkflow.getCanvasTransform', () => {
        return getTransformState()
    })
    testActionSet('pageWorkflow.dragCanvasNodeForTest', (id: string, deltaX = 120, deltaY = 40) => {
        const graphModel = (lf as any)?.graphModel
        if (!graphModel) return null
        graphModel.moveNode(id, deltaX, deltaY, true)
        syncGraph()
        return fromLogicFlowData().nodes.find((node) => node.id === id) || null
    })
    if (!canvasRef.value) return
    lf = new LogicFlow({
        container: canvasRef.value,
        grid: {
            size: 18,
            visible: true,
            type: 'dot',
            config: { color: '#dbe2ea', thickness: 1 },
        },
        keyboard: { enabled: true },
        animation: true,
        adjustEdge: false,
        allowResize: false,
        adjustNodePosition: !props.readonly,
        hideAnchors: !!props.readonly,
        nodeTextEdit: false,
        edgeTextEdit: false,
        edgeType: 'bezier',
    })
    lf.setZoomMaxSize(fitZoomMax())
    lf.register({
        type: 'workflow-node',
        view: WorkflowLogicNode,
        model: WorkflowLogicNodeModel,
    })
    lf.setDefaultEdgeType('bezier')
    lf.setTheme({
        bezier: { stroke: '#8b9bb0', strokeWidth: 1.5 },
        anchor: { r: 5, stroke: '#2563eb', fill: '#fff', strokeWidth: 1.5 },
        anchorHover: { r: 6, fill: '#2563eb', stroke: '#2563eb' },
    })
    lf.graphModel.editConfigModel.updateEditConfig({ edgeSelectedOutline: false })
    lf.on('node:click', ({ data }: any) => {
        selectNode(data.id)
    })
    lf.on('blank:click', () => {
        selectNode('')
    })
    lf.on('node:drop,edge:add,edge:delete,history:change', syncGraph)
    renderGraph()
})

watch(
    () => [props.nodes, props.edges],
    () => {
        if (skipNextGraphRender || syncingFromLogicFlow) return
        renderGraph()
    },
    { deep: true },
)

watch(
    () => props.selectedNodeId,
    (id) => {
        if (!lf) return
        if (!id) {
            lf.clearSelectElements()
            return
        }
        lf.selectElementById(id, false, true)
    },
)

watch(
    () => `${props.nodes.map((node) => node.id).join(',')}|${props.maxFitZoom}`,
    () => {
        fitted = false
        fitGraphOnce()
    },
)

onBeforeUnmount(() => {
    testActionUnset([
        'pageWorkflow.openNodePicker',
        'pageWorkflow.closeNodePicker',
        'pageWorkflow.getCanvasTransform',
        'pageWorkflow.dragCanvasNodeForTest',
    ])
    lf?.destroy?.()
    lf = null
})
</script>

<template>
    <div class="relative overflow-hidden bg-slate-50" data-testid="workflow-canvas">
        <div ref="canvasRef" class="h-full w-full" />

        <div
            v-if="toolbar !== false"
            class="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm"
            data-testid="workflow-canvas-toolbar"
        >
            <a-button
                v-if="!readonly"
                class="rounded-lg border-0"
                :aria-label="t('workflow.selectNode')"
                @click="nodePickerVisible = true"
            >
                <template #icon><icon-plus /></template>
            </a-button>
            <a-button class="rounded-lg border-0" :aria-label="t('workflow.zoomIn')" @click="lf?.zoom(true)">
                <template #icon><icon-zoom-in /></template>
            </a-button>
            <a-button class="rounded-lg border-0" :aria-label="t('workflow.zoomOut')" @click="lf?.zoom(false)">
                <template #icon><icon-zoom-out /></template>
            </a-button>
            <a-button class="rounded-lg border-0" :aria-label="t('workflow.autoFit')" @click="fitGraph">
                <template #icon><icon-fullscreen /></template>
            </a-button>
        </div>

        <a-modal v-model:visible="nodePickerVisible" width="min(520px, 90vw)" :footer="false" title-align="start">
            <template #title>
                <div class="font-bold">{{ $t('workflow.selectNode') }}</div>
            </template>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="workflow-node-picker-modal">
                <a-button
                    v-for="item in workflowNodeTypes"
                    :key="item.type"
                    class="flex h-16 items-center justify-start gap-3 px-4"
                    @click="chooseNodeType(item.type)"
                >
                    <span
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-xs font-bold text-slate-600"
                    >
                        {{ iconText(item.type) }}
                    </span>
                    <span class="truncate font-bold text-slate-700">{{ nodeTypeTitle(item.type, t) }}</span>
                </a-button>
            </div>
        </a-modal>
    </div>
</template>

<style>
.lf-node-text-auto-wrap-content {
    display: none;
}

.lf-node-text,
.lf-node-text-auto-wrap {
    display: none;
}

/* Edge stroke highlighting when selected */
.lf-edge-selected path {
    stroke: #2563eb !important;
    stroke-width: 2.5 !important;
}
</style>
