<script setup lang="ts">
import { computed } from 'vue'
import CodeEditor from '../../../../components/common/CodeEditor.vue'
import { WorkflowNode } from '../../types'

const props = defineProps<{
    selectedNode: WorkflowNode
}>()

const commandValue = computed({
    get() {
        return props.selectedNode.properties.command || 'pwd'
    },
    set(value: string) {
        props.selectedNode.properties.command = value
    },
})
</script>

<template>
    <div>
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.commandTitle') }}</div>
        <CodeEditor v-model="commandValue" lang="shell" height="12rem" />
    </div>
</template>
