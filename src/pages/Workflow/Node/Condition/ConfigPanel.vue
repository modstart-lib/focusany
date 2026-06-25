<script setup lang="ts">
import { computed } from 'vue'
import { WorkflowNode } from '../../types'
import { WorkflowVariableOption } from '../../variable'
import WorkflowVariableInput from '../../components/WorkflowVariableInput.vue'

const props = defineProps<{
    selectedNode: WorkflowNode
    variables?: WorkflowVariableOption[]
}>()

const leftValue = computed({
    get() {
        return props.selectedNode.properties.leftValue ?? ''
    },
    set(value: string) {
        props.selectedNode.properties.leftValue = value
    },
})

const rightValue = computed({
    get() {
        return props.selectedNode.properties.rightValue ?? ''
    },
    set(value: string) {
        props.selectedNode.properties.rightValue = value
    },
})
</script>

<template>
    <div>
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.leftValue') }}</div>
        <WorkflowVariableInput v-model="leftValue" :variables="variables || []" placeholder="ok" />
    </div>
    <div>
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.judgeType') }}</div>
        <a-select v-model="selectedNode.properties.operator">
            <a-option value="equals">=</a-option>
            <a-option value="notEquals">≠</a-option>
            <a-option value="greaterThan">＞</a-option>
            <a-option value="lessThan">＜</a-option>
            <a-option value="greaterThanOrEquals">≥</a-option>
            <a-option value="lessThanOrEquals">≤</a-option>
            <a-option value="contains">{{ $t('workflow.contains') }}</a-option>
        </a-select>
    </div>
    <div>
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.rightValue') }}</div>
        <WorkflowVariableInput v-model="rightValue" :variables="variables || []" placeholder="ok" />
    </div>
</template>
