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
        <div class="mb-2 text-sm text-gray-700">{{ $t('JS代码') }}</div>
        <CodeEditor v-model="codeValue" lang="javascript" height="14rem" />
    </div>
    <div>
        <div class="mb-2 text-sm text-gray-700">{{ $t('输出类型') }}</div>
        <a-select v-model="outputType">
            <a-option value="any">{{ $t('任意') }}</a-option>
            <a-option value="text">{{ $t('文本') }}</a-option>
            <a-option value="json">JSON</a-option>
        </a-select>
    </div>
</template>
