<script setup lang="ts">
import { computed } from 'vue'
import ModelSelector from '../../../../module/Model/ModelSelector.vue'
import { WorkflowNode } from '../../types'
import { WorkflowVariableOption } from '../../variable'
import WorkflowVariableInput from '../../components/WorkflowVariableInput.vue'

const props = defineProps<{
    selectedNode: WorkflowNode
    variables?: WorkflowVariableOption[]
}>()

const selectedModelProvider = computed({
    get() {
        const properties = props.selectedNode.properties
        if (properties.modelProvider) return properties.modelProvider
        if (properties.providerId && properties.modelId) return `${properties.providerId}|${properties.modelId}`
        return ''
    },
    set(value: string) {
        props.selectedNode.properties.modelProvider = value
        const [providerId, modelId] = value.split('|')
        props.selectedNode.properties.providerId = providerId || ''
        props.selectedNode.properties.modelId = modelId || ''
    },
})

const promptValue = computed({
    get() {
        return props.selectedNode.properties.prompt ?? ''
    },
    set(value: string) {
        props.selectedNode.properties.prompt = value
    },
})
</script>

<template>
    <div>
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.modelProvider') }}</div>
        <ModelSelector v-model="selectedModelProvider" class="w-full" />
    </div>
    <div>
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.prompt') }}</div>
        <WorkflowVariableInput
            v-model="promptValue"
            textarea
            :variables="variables || []"
            :placeholder="$t('workflow.summaryLastNode')"
        />
    </div>
</template>
