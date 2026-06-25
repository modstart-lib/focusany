<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { WorkflowNode } from '../../types'

const { t } = useI18n()

defineProps<{
    selectedNode: WorkflowNode
}>()
</script>

<template>
    <div>
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.triggerType') }}</div>
        <a-select v-model="selectedNode.properties.triggerType">
            <a-option value="manual">{{ $t('workflow.manual') }}</a-option>
            <a-option value="timer">{{ $t('workflow.timer') }}</a-option>
            <a-option value="event">{{ $t('workflow.event') }}</a-option>
        </a-select>
    </div>
    <div v-if="selectedNode.properties.triggerType === 'timer'">
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.cronExpression') }}</div>
        <a-input v-model="selectedNode.properties.cronExpression" placeholder="* * * * *" />
    </div>
    <div v-if="selectedNode.properties.triggerType === 'event'">
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.eventName') }}</div>
        <a-input v-model="selectedNode.properties.eventName" placeholder="demo.event" />
    </div>
</template>
