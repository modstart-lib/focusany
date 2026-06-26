<script setup lang="ts">
import { WorkflowVariableOption } from '../variable'

const props = withDefaults(
    defineProps<{
        modelValue?: string
        variables?: WorkflowVariableOption[]
        textarea?: boolean
        placeholder?: string
    }>(),
    {
        modelValue: '',
        variables: () => [],
        textarea: false,
        placeholder: '',
    },
)

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const insertVariable = (token: string) => {
    emit('update:modelValue', `${props.modelValue || ''}${token}`)
}
</script>

<template>
    <div class="flex items-start gap-2" data-testid="workflow-variable-input">
        <a-textarea
            v-if="textarea"
            :model-value="modelValue"
            class="min-w-0 flex-1"
            :placeholder="placeholder"
            @update:model-value="emit('update:modelValue', $event)"
        />
        <a-input
            v-else
            :model-value="modelValue"
            class="min-w-0 flex-1"
            :placeholder="placeholder"
            @update:model-value="emit('update:modelValue', $event)"
        />
        <a-dropdown v-if="variables.length" trigger="click">
            <a-button :aria-label="$t('workflow.insertVariable')">
                <template #icon><icon-code /></template>
            </a-button>
            <template #content>
                <div class="max-h-64 min-w-[220px] overflow-y-auto p-1" data-testid="workflow-variable-menu">
                    <div
                        v-for="item in variables"
                        :key="`${item.nodeId}.${item.fieldName}`"
                        class="cursor-pointer rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                        @click="insertVariable(item.token)"
                    >
                        <div class="font-bold">{{ item.token }}</div>
                        <div class="text-gray-400">{{ item.fieldTitle }}</div>
                    </div>
                </div>
            </template>
        </a-dropdown>
    </div>
</template>
