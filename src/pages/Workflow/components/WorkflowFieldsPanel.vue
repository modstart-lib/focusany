<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { computed } from 'vue'
import { WorkflowNode, WorkflowNodeField } from '../types'
import { WorkflowVariableOption } from '../variable'
import WorkflowVariableInput from './WorkflowVariableInput.vue'

const props = defineProps<{
    selectedNode: WorkflowNode
    variables: WorkflowVariableOption[]
    type: 'input' | 'output'
}>()

const inputFields = computed(() => props.selectedNode.properties.inputFields || [])
const outputFields = computed(() => props.selectedNode.properties.outputFields || [])
const fields = computed(() => (props.type === 'input' ? inputFields.value : outputFields.value))
const emptyText = computed(() => (props.type === 'input' ? '暂无输入参数' : '暂无输出参数'))
const testId = computed(() => (props.type === 'input' ? 'workflow-fields-panel' : 'workflow-output-fields'))
const outputToken = (field: WorkflowNodeField) => '${' + props.selectedNode.title + '.' + field.name + '}'

const doCopyOutputToken = async (field: WorkflowNodeField) => {
    await window.$mapi.app.setClipboardText(outputToken(field))
    Message.success('已复制')
}

const typeTitle = (type: WorkflowNodeField['type']) => {
    if (type === 'any') return '任意'
    if (type === 'textarea') return '多行文本'
    if (type === 'number') return '数字'
    if (type === 'boolean') return '布尔'
    if (type === 'json') return 'JSON'
    return '文本'
}
</script>

<template>
    <div :data-testid="testId">
        <div v-if="fields.length && type === 'input'" class="space-y-3">
            <div v-for="field in fields" :key="field.name">
                <div class="mb-2 flex items-center justify-between gap-2">
                    <div class="min-w-0 truncate text-sm text-gray-700">{{ field.title || field.name }}</div>
                    <div class="shrink-0 text-xs text-gray-400">{{ field.name }}</div>
                </div>
                <a-switch v-if="field.type === 'boolean'" v-model="field.value" />
                <a-input-number v-else-if="field.type === 'number'" v-model="field.value" class="w-full" />
                <WorkflowVariableInput
                    v-else
                    v-model="field.value"
                    :textarea="field.type === 'textarea' || field.type === 'json'"
                    :variables="variables"
                    :placeholder="String(field.defaultValue || '')"
                />
            </div>
        </div>
        <div v-else-if="fields.length" class="space-y-2">
            <div
                v-for="field in fields"
                :key="field.name"
                class="flex cursor-pointer items-center justify-between gap-3 rounded bg-gray-50 px-3 py-2 hover:bg-blue-50"
                @click="doCopyOutputToken(field)"
            >
                <div class="min-w-0">
                    <div class="truncate text-sm font-bold text-gray-700">{{ field.title || field.name }}</div>
                    <div class="truncate text-xs text-gray-400">{{ outputToken(field) }}</div>
                </div>
                <a-tag class="shrink-0">{{ typeTitle(field.type) }}</a-tag>
            </div>
        </div>
        <a-empty v-else :description="emptyText" />
    </div>
</template>
