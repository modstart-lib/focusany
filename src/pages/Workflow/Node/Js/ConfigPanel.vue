<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CodeEditor from '../../../../components/common/CodeEditor.vue'

const { t } = useI18n()
import { WorkflowNode } from '../../types'

const props = defineProps<{
    selectedNode: WorkflowNode
}>()

const codeValue = computed({
    get() {
        return (
            props.selectedNode.properties.code ||
            `;(function () {
    return 'js result'
})()`
        )
    },
    set(value: string) {
        props.selectedNode.properties.code = value
    },
})

const outputType = computed({
    get() {
        return props.selectedNode.properties.outputType || 'text'
    },
    set(value: string) {
        props.selectedNode.properties.outputType = value
        const field = props.selectedNode.properties.outputFields?.find((item) => item.name === 'Result')
        if (field) field.type = value === 'json' || value === 'any' ? value : 'text'
    },
})
</script>

<template>
    <div>
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.jsCode') }}</div>
        <CodeEditor v-model="codeValue" lang="javascript" height="14rem" />
    </div>
    <div>
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.outputType') }}</div>
        <a-select v-model="outputType">
            <a-option value="any">{{ $t('workflow.anyType') }}</a-option>
            <a-option value="text">{{ $t('workflow.textType') }}</a-option>
            <a-option value="json">JSON</a-option>
        </a-select>
    </div>
</template>
