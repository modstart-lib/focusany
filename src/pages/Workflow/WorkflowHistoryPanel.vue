<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import WorkflowCanvas from './WorkflowCanvas.vue'
import { testActionSet, testActionUnset } from '../../utils/test'

const { t } = useI18n()

const props = defineProps<{
    workflowId: string
    workflows: any[]
    logs: any[]
}>()

const activeLog = ref<any | null>(null)
const textVisible = ref(false)
const visualVisible = ref(false)
const activeNodeId = ref('')

const workflowName = computed(
    () => props.workflows.find((workflow) => workflow.id === props.workflowId)?.name || t('workflow.workflow'),
)
const workflow = computed(() =>
    props.workflows.find((item) => item.id === (activeLog.value?.workflowId || props.workflowId)),
)
const records = computed(() => props.logs.filter((log) => log.workflowId === props.workflowId))
const visualNodes = computed(() => workflow.value?.data?.nodes || [])
const visualEdges = computed(() => workflow.value?.data?.edges || [])
const activeRunNode = computed(() => (activeLog.value?.nodes || []).find((node: any) => node.id === activeNodeId.value))
const activeGraphNode = computed(() => visualNodes.value.find((node: any) => node.id === activeNodeId.value))

const statusText = (status: string) =>
    status === 'success'
        ? t('workflow.statusSuccess')
        : status === 'running'
          ? t('workflow.running')
          : status === 'failed'
            ? t('workflow.statusFailed')
            : '跳过'
const triggerText = (type: string) => {
    if (type === 'manual') return t('workflow.triggerManual')
    if (type === 'timer') return t('workflow.triggerTimer')
    if (type === 'event') return t('workflow.triggerEvent')
    return type || t('workflow.triggerUnknown')
}
const timeText = (time: number) => (time ? new Date(time).toLocaleString() : '-')
const durationText = (log: any) => {
    if (!log?.startedAt || !log?.endedAt) return '-'
    return `${Math.max(0, log.endedAt - log.startedAt)}ms`
}
const textLogLines = computed(() => {
    const log = activeLog.value
    if (!log) return []
    const lines: string[] = [
        `${log.workflowName} · ${statusText(log.status)}`,
        `${t('workflow.triggerLabel')}：${triggerText(log.triggerType)}`,
        `${t('workflow.startTime')}：${timeText(log.startedAt)}`,
        `${t('workflow.durationLabel')}：${durationText(log)}`,
        `${t('workflow.summary')}：${log.message || '-'}`,
    ]
    ;(log.nodes || []).forEach((node: any, index: number) => {
        const output = node.output === undefined ? '' : `，${t('workflow.output')}：${node.output}`
        const message = node.message ? `，${t('workflow.log')}：${node.message}` : ''
        lines.push(`${index + 1}. ${node.id} [${node.type}] ${statusText(node.status)}${output}${message}`)
    })
    return lines
})

const openTextLog = (log: any) => {
    activeLog.value = log
    textVisible.value = true
}
const openVisualLog = (log: any) => {
    activeLog.value = log
    activeNodeId.value = log.nodes?.[0]?.id || visualNodes.value[0]?.id || ''
    visualVisible.value = true
}

onMounted(() => {
    testActionSet('pageWorkflow.openFirstTextLog', () => {
        const log = records.value[0]
        if (!log) return false
        openTextLog(log)
        return textVisible.value && textLogLines.value.length > 0
    })
    testActionSet('pageWorkflow.closeTextLog', () => {
        textVisible.value = false
        return textVisible.value
    })
})

onUnmounted(() => {
    testActionUnset(['pageWorkflow.openFirstTextLog', 'pageWorkflow.closeTextLog'])
})
</script>

<template>
    <div class="min-h-0 flex-grow overflow-y-auto bg-gray-50 p-5">
        <div v-if="records.length" class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div
                v-for="log in records"
                :key="log.id"
                class="flex min-h-[168px] flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                data-testid="workflow-history-card"
            >
                <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                        <div class="truncate text-base font-bold text-gray-950">{{ workflowName }}</div>
                        <div class="mt-2 text-sm text-gray-500">{{ timeText(log.startedAt) }}</div>
                    </div>
                    <div
                        class="shrink-0 rounded-full px-3 py-1 text-sm font-bold"
                        :class="[
                            log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : '',
                            log.status === 'running' ? 'bg-blue-50 text-blue-600' : '',
                            log.status !== 'success' && log.status !== 'running' ? 'bg-red-50 text-red-600' : '',
                        ]"
                    >
                        {{ statusText(log.status) }}
                    </div>
                </div>
                <div class="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <div>
                        <div class="text-gray-400">{{ $t('workflow.triggerLabel2') }}</div>
                        <div class="mt-1 font-bold text-gray-800">{{ triggerText(log.triggerType) }}</div>
                    </div>
                    <div>
                        <div class="text-gray-400">{{ $t('workflow.nodeLabel') }}</div>
                        <div class="mt-1 font-bold text-gray-800">{{ log.nodes?.length || 0 }}</div>
                    </div>
                    <div>
                        <div class="text-gray-400">{{ $t('workflow.durationLabel') }}</div>
                        <div class="mt-1 font-bold text-gray-800">{{ durationText(log) }}</div>
                    </div>
                </div>
                <div class="mt-auto flex justify-end gap-2 pt-5">
                    <a-button data-testid="workflow-log-button" @click="openTextLog(log)">
                        <template #icon><icon-file /></template>
                        {{ $t('workflow.log') }}
                    </a-button>
                    <a-button data-testid="workflow-visual-button" @click="openVisualLog(log)">
                        <template #icon><icon-eye /></template>
                        {{ $t('workflow.view') }}
                    </a-button>
                </div>
            </div>
        </div>
        <a-empty v-else class="py-16" :description="$t('workflow.noRecords')" />

        <a-modal v-model:visible="textVisible" width="min(760px, 92vw)" :footer="false" title-align="start">
            <template #title>
                <div class="font-bold">{{ $t('workflow.textLog') }}</div>
            </template>
            <div
                class="max-h-[70vh] overflow-y-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-100"
                data-testid="workflow-log-modal"
            >
                <div v-for="line in textLogLines" :key="line" class="whitespace-pre-wrap leading-7">{{ line }}</div>
            </div>
        </a-modal>

        <a-modal v-model:visible="visualVisible" width="95vw" :footer="false" title-align="start">
            <template #title>
                <div class="font-bold">{{ $t('workflow.executionStatus') }}</div>
            </template>
            <div
                class="grid h-[72vh] grid-cols-[1fr_320px] overflow-hidden rounded-lg border border-gray-200"
                data-testid="workflow-visual-modal"
            >
                <WorkflowCanvas
                    class="h-full"
                    v-model:selected-node-id="activeNodeId"
                    :nodes="visualNodes"
                    :edges="visualEdges"
                    :readonly="true"
                    :max-fit-zoom="1"
                    data-testid="workflow-visual-canvas"
                    @add-node="() => {}"
                    @connect-nodes="() => {}"
                    @graph-change="() => {}"
                    @move-node="() => {}"
                />
                <div class="overflow-y-auto border-l border-gray-200 bg-white p-5">
                    <div class="text-lg font-bold text-gray-950">
                        {{ activeGraphNode?.title || $t('workflow.nodeDetail') }}
                    </div>
                    <div class="mt-2 text-sm text-gray-500">{{ activeGraphNode?.id }}</div>
                    <div class="mt-5 rounded-lg bg-gray-50 p-4">
                        <div class="text-sm text-gray-400">{{ $t('workflow.execState') }}</div>
                        <div
                            class="mt-1 font-bold"
                            :class="[
                                activeRunNode?.status === 'success' ? 'text-emerald-600' : '',
                                activeRunNode?.status === 'failed' ? 'text-red-600' : '',
                                activeRunNode?.status !== 'success' && activeRunNode?.status !== 'failed'
                                    ? 'text-gray-500'
                                    : '',
                            ]"
                        >
                            {{ statusText(activeRunNode?.status || 'skipped') }}
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="mb-2 text-sm font-bold text-gray-700">{{ $t('workflow.logInfo') }}</div>
                        <div class="min-h-28 rounded-lg bg-gray-950 p-4 text-sm leading-7 text-gray-100">
                            <div v-if="activeRunNode?.message">{{ activeRunNode.message }}</div>
                            <div v-if="activeRunNode?.output !== undefined">{{ activeRunNode.output }}</div>
                            <div v-if="!activeRunNode?.message && activeRunNode?.output === undefined">
                                {{ $t('workflow.noLog') }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </a-modal>
    </div>
</template>
