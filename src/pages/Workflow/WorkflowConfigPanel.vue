<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import { WorkflowEdge, WorkflowNode } from './types'
import { iconText, subTitle, nodeConfigComponents } from './Node'
import WorkflowFieldsPanel from './components/WorkflowFieldsPanel.vue'
import { listWorkflowVariables } from './variable'

const { t } = useI18n()

const props = defineProps<{
    selectedNode: WorkflowNode | null
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
}>()

const emit = defineEmits<{
    close: []
}>()

const configComponent = computed(() => {
    if (!props.selectedNode) return null
    return nodeConfigComponents[props.selectedNode.type] || null
})

const variables = computed(() => listWorkflowVariables(props.selectedNode, props.nodes, props.edges))
const hasInputFields = computed(() => !!props.selectedNode?.properties.inputFields?.length)
const hasOutputFields = computed(() => !!props.selectedNode?.properties.outputFields?.length)
const titleModalVisible = ref(false)
const titleDraft = ref('')

const showTitleModal = () => {
    titleDraft.value = props.selectedNode?.title || ''
    titleModalVisible.value = true
}

const doSaveTitle = () => {
    if (!props.selectedNode) return
    props.selectedNode.title = titleDraft.value.trim() || props.selectedNode.title
    titleModalVisible.value = false
}

watch(
    () => props.selectedNode?.id,
    () => {
        titleModalVisible.value = false
    },
)
</script>

<template>
    <div class="h-full overflow-y-auto bg-white">
        <template v-if="selectedNode">
            <div class="flex items-center gap-3 border-b border-gray-200 px-4 py-4">
                <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 font-bold text-white"
                >
                    {{ iconText(selectedNode.type) }}
                </div>
                <div class="min-w-0 flex-grow">
                    <div class="text-xs text-gray-400">{{ subTitle(selectedNode.type, t) }}</div>
                    <div class="truncate font-bold text-gray-950">{{ selectedNode.title }}</div>
                </div>
                <a-button :aria-label="$t('编辑节点标题')" @click="showTitleModal">
                    <template #icon><icon-edit /></template>
                </a-button>
                <a-button :aria-label="t('workflow.closeNodeConfig')" @click="emit('close')">
                    <template #icon><icon-close /></template>
                </a-button>
            </div>

            <div class="space-y-5 p-4">
                <div v-if="hasInputFields" class="space-y-3">
                    <div class="flex items-center gap-2 font-bold text-gray-800">
                        <icon-import />
                        <span>{{ $t('输入参数') }}</span>
                    </div>
                    <WorkflowFieldsPanel type="input" :selected-node="selectedNode" :variables="variables" />
                </div>

                <div class="space-y-3" data-testid="workflow-config-section">
                    <div class="flex items-center gap-2 font-bold text-gray-800">
                        <icon-settings />
                        <span>{{ $t('配置项') }}</span>
                    </div>
                    <div class="space-y-4">
                        <component :is="configComponent" :selected-node="selectedNode" :variables="variables" />
                    </div>
                </div>

                <div v-if="hasOutputFields" class="space-y-3">
                    <div class="flex items-center gap-2 font-bold text-gray-800">
                        <icon-export />
                        <span>{{ $t('输出参数') }}</span>
                    </div>
                    <WorkflowFieldsPanel type="output" :selected-node="selectedNode" :variables="variables" />
                </div>
            </div>

            <a-modal v-model:visible="titleModalVisible" width="min(600px, 90vw)" :footer="false" title-align="start">
                <template #title
                    ><div class="font-bold">{{ $t('编辑节点标题') }}</div></template
                >
                <div class="space-y-4 p-4">
                    <a-input v-model="titleDraft" :placeholder="$t('workflow.nodeTitle')" />
                    <div class="flex justify-end gap-2">
                        <a-button @click="titleModalVisible = false">{{ $t('common.cancel') }}</a-button>
                        <a-button type="primary" @click="doSaveTitle">{{ $t('common.save') }}</a-button>
                    </div>
                </div>
            </a-modal>
        </template>
        <div v-else class="flex h-full items-center justify-center p-4">
            <a-empty :description="$t('workflow.selectNode')" />
        </div>
    </div>
</template>
