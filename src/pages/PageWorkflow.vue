<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/PageHeader.vue'
import { testActionSet, testActionUnset } from '../utils/test'
import WorkflowCanvas from './Workflow/WorkflowCanvas.vue'
import WorkflowConfigPanel from './Workflow/WorkflowConfigPanel.vue'
import WorkflowHistoryPanel from './Workflow/WorkflowHistoryPanel.vue'
import WorkflowListPanel from './Workflow/WorkflowListPanel.vue'
import { WorkflowNodeType } from './Workflow/types'
import { useWorkflowPage } from './Workflow/useWorkflowPage'

const { t } = useI18n()

const {
    workflows,
    logs,
    name,
    viewMode,
    historyWorkflowId,
    selectedNodeId,
    runningWorkflowIds,
    nodes,
    edges,
    selectedNode,
    newWorkflow,
    saveWorkflow,
    deleteWorkflowRecord,
    runWorkflowRecord,
    copyWorkflowRecord,
    addNode,
    moveNode,
    connectNodes,
    replaceGraph,
    openWorkflowEditor,
    backToList,
    openWorkflowHistory,
} = useWorkflowPage()

const configPanelVisible = ref(false)

const selectNode = (id: string) => {
    selectedNodeId.value = id
    configPanelVisible.value = !!id
}

const doAddNode = (type: WorkflowNodeType, position?: { x: number; y: number }) => {
    addNode(type, position)
    configPanelVisible.value = true
}

const doRunWorkflowRecord = async (workflow: any) => {
    await runWorkflowRecord(workflow)
    Message.success(t('workflow.runSuccess'))
}

const doOpenWorkflowEditor = (workflow: any) => {
    openWorkflowEditor(workflow)
    configPanelVisible.value = false
}

const historyWorkflowName = computed(
    () => workflows.value.find((workflow) => workflow.id === historyWorkflowId.value)?.name || t('workflow.workflow'),
)

const doSaveWorkflow = async () => {
    await saveWorkflow()
    Message.success(t('common.saveSuccess'))
}

onMounted(() => {
    testActionSet('pageWorkflow.selectNodeWithPanel', (id: string) => selectNode(id))
    testActionSet('pageWorkflow.clearSelectionWithPanel', () => selectNode(''))
})

onUnmounted(() => {
    testActionUnset(['pageWorkflow.selectNodeWithPanel', 'pageWorkflow.clearSelectionWithPanel'])
})
</script>

<template>
    <div class="flex h-dvh flex-col bg-gray-50">
        <PageHeader
            :title="
                viewMode === 'list'
                    ? `${$t('workflow.workflow')} · ${$t('workflow.totalCount', { count: workflows.length })}`
                    : ''
            "
            compact
        >
            <template v-if="viewMode === 'edit'" #title>
                <div class="flex items-center gap-3" data-testid="workflow-edit-header">
                    <a-button :aria-label="t('workflow.backToList')" @click="backToList">
                        <template #icon><icon-left /></template>
                    </a-button>
                    <a-input
                        v-model="name"
                        class="max-w-[420px] min-w-[220px]"
                        :placeholder="t('workflow.workflowName')"
                    />
                </div>
            </template>
            <template v-else-if="viewMode === 'history'" #title>
                <div class="flex items-center gap-3" data-testid="workflow-history-header">
                    <a-button :aria-label="$t('workflow.backToList')" @click="backToList">
                        <template #icon><icon-left /></template>
                    </a-button>
                    <div class="truncate text-base font-bold text-gray-900">
                        {{ $t('workflow.runHistoryTitle', { name: historyWorkflowName }) }}
                    </div>
                </div>
            </template>
            <template v-if="viewMode === 'list'">
                <a-button type="primary" @click="newWorkflow">{{ $t('workflow.createWorkflow') }}</a-button>
            </template>
            <template v-else-if="viewMode === 'edit'">
                <a-button :aria-label="$t('common.setting')" @click="configPanelVisible = !configPanelVisible">
                    <template #icon><icon-settings /></template>
                </a-button>
                <a-button type="primary" @click="doSaveWorkflow">
                    <template #icon><icon-check /></template>
                    {{ $t('common.save') }}
                </a-button>
            </template>
        </PageHeader>

        <WorkflowListPanel
            v-if="viewMode === 'list'"
            :workflows="workflows"
            :running-workflow-ids="runningWorkflowIds"
            @create="newWorkflow"
            @edit="doOpenWorkflowEditor"
            @run="doRunWorkflowRecord"
            @delete="deleteWorkflowRecord"
            @copy="copyWorkflowRecord"
            @history="openWorkflowHistory"
        />

        <WorkflowHistoryPanel
            v-else-if="viewMode === 'history'"
            :workflow-id="historyWorkflowId"
            :workflows="workflows"
            :logs="logs"
        />

        <div v-else class="relative min-h-0 flex-grow overflow-hidden">
            <WorkflowCanvas
                class="h-full w-full"
                :nodes="nodes"
                :edges="edges"
                :selected-node-id="selectedNodeId"
                @add-node="doAddNode"
                @connect-nodes="connectNodes"
                @graph-change="replaceGraph"
                @move-node="moveNode"
                @update:selected-node-id="selectNode"
            />
            <WorkflowConfigPanel
                v-if="configPanelVisible"
                class="absolute right-0 top-0 z-10 h-full w-[360px] border-l border-gray-200 bg-white shadow-lg"
                :selected-node="selectedNode"
                :nodes="nodes"
                :edges="edges"
                @close="configPanelVisible = false"
            />
        </div>
    </div>
</template>
