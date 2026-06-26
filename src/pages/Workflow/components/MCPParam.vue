<script lang="ts">
export type McpToolProperty = {
    type?: string
    title?: string
    description?: string
    default?: any
    enum?: any[]
    items?: McpToolProperty
    properties?: Record<string, McpToolProperty>
    required?: string[]
}

export type McpInputSchema = {
    type?: string
    properties?: Record<string, McpToolProperty>
    required?: string[]
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CodeEditor from '../../../components/common/CodeEditor.vue'

const { t } = useI18n()
import { WorkflowVariableOption } from '../variable'
import WorkflowVariableInput from './WorkflowVariableInput.vue'

const props = withDefaults(
    defineProps<{
        modelValue?: Record<string, any>
        schema?: McpInputSchema
        variables?: WorkflowVariableOption[]
    }>(),
    {
        modelValue: () => ({}),
        schema: () => ({ type: 'object', properties: {}, required: [] }),
        variables: () => [],
    },
)

const emit = defineEmits<{
    'update:modelValue': [value: Record<string, any>]
}>()

const mode = ref<'visual' | 'json'>('visual')
const jsonText = ref('')
const jsonError = ref('')

const schemaProperties = computed(() => Object.entries(props.schema?.properties || {}))

const argumentsValue = computed({
    get() {
        return props.modelValue || {}
    },
    set(value: Record<string, any>) {
        emit('update:modelValue', value)
    },
})

const isRequired = (name: string) => !!props.schema?.required?.includes(name)

const isObjectRequired = (schema: McpToolProperty, name: string) => !!schema.required?.includes(name)

const schemaObjectProperties = (schema: McpToolProperty) => Object.entries(schema.properties || {})

const defaultValueBySchema = (schema: McpToolProperty): any => {
    if (schema.default !== undefined) return schema.default
    if (schema.type === 'boolean') return false
    if (schema.type === 'number' || schema.type === 'integer') return 0
    if (schema.type === 'array') return []
    if (schema.type === 'object') return {}
    return ''
}

const ensureObjectArgument = (target: Record<string, any>, name: string) => {
    if (!target[name] || typeof target[name] !== 'object' || Array.isArray(target[name])) {
        target[name] = {}
    }
}

const applySchemaDefaults = () => {
    const next = { ...argumentsValue.value }
    for (const [name, schema] of schemaProperties.value) {
        if (next[name] === undefined) next[name] = defaultValueBySchema(schema)
        if (schema.type === 'object' && schema.properties) {
            ensureObjectArgument(next, name)
            next[name] = { ...next[name] }
            for (const [childName, childSchema] of schemaObjectProperties(schema)) {
                if (next[name][childName] !== undefined) continue
                next[name][childName] = defaultValueBySchema(childSchema)
            }
        }
    }
    argumentsValue.value = next
}

const updateArgument = (name: string, value: any) => {
    argumentsValue.value = { ...argumentsValue.value, [name]: value }
}

const updateObjectArgument = (name: string, childName: string, value: any) => {
    argumentsValue.value = {
        ...argumentsValue.value,
        [name]: {
            ...(argumentsValue.value[name] || {}),
            [childName]: value,
        },
    }
}

const formatJson = (value: Record<string, any>) => JSON.stringify(value || {}, null, 4)

const applyJsonText = () => {
    try {
        const value = JSON.parse(jsonText.value || '{}')
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            jsonError.value = t('workflow.jsonMustBeObject')
            return false
        }
        jsonError.value = ''
        argumentsValue.value = value
        applySchemaDefaults()
        return true
    } catch (e) {
        jsonError.value = e instanceof Error ? e.message : String(e)
        return false
    }
}

const onModeChange = (value: 'visual' | 'json') => {
    if (value === 'json') {
        jsonText.value = formatJson(argumentsValue.value)
        jsonError.value = ''
        mode.value = value
        return
    }
    if (applyJsonText()) mode.value = value
}

watch(
    () => props.schema,
    () => applySchemaDefaults(),
    { immediate: true, deep: true },
)
</script>

<template>
    <div class="space-y-3" data-testid="workflow-mcp-param">
        <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-bold text-gray-800">{{ $t('workflow.arguments') }}</div>
            <a-radio-group
                :model-value="mode"
                type="button"
                data-testid="workflow-mcp-param-mode"
                @change="onModeChange"
            >
                <a-radio value="visual">{{ $t('workflow.visualConfig') }}</a-radio>
                <a-radio value="json">{{ $t('workflow.jsonConfig') }}</a-radio>
            </a-radio-group>
        </div>

        <div v-if="mode === 'json'" class="space-y-2" data-testid="workflow-mcp-param-json">
            <CodeEditor v-model="jsonText" lang="json" height="18rem" />
            <a-alert v-if="jsonError" type="error" :content="jsonError" />
        </div>

        <div v-else-if="schemaProperties.length" class="space-y-4" data-testid="workflow-mcp-param-visual">
            <div v-for="[name, schemaItem] in schemaProperties" :key="name">
                <div class="mb-2 flex items-center gap-1 text-sm text-gray-700">
                    <span>{{ schemaItem.title || name }}</span>
                    <span v-if="isRequired(name)" class="text-red-500">*</span>
                </div>
                <a-select
                    v-if="schemaItem.enum && schemaItem.enum.length"
                    :model-value="argumentsValue[name]"
                    allow-search
                    @update:model-value="updateArgument(name, $event)"
                >
                    <a-option v-for="item in schemaItem.enum" :key="String(item)" :value="item">
                        {{ String(item) }}
                    </a-option>
                </a-select>
                <a-switch
                    v-else-if="schemaItem.type === 'boolean'"
                    :model-value="argumentsValue[name]"
                    @update:model-value="updateArgument(name, $event)"
                />
                <a-input-number
                    v-else-if="schemaItem.type === 'number' || schemaItem.type === 'integer'"
                    :model-value="argumentsValue[name]"
                    class="w-full"
                    @update:model-value="updateArgument(name, $event)"
                />
                <a-input-tag
                    v-else-if="schemaItem.type === 'array'"
                    :model-value="argumentsValue[name]"
                    :placeholder="schemaItem.description || name"
                    @update:model-value="updateArgument(name, $event)"
                />
                <div
                    v-else-if="schemaItem.type === 'object' && schemaItem.properties"
                    class="space-y-3 rounded border border-gray-100 p-3"
                >
                    <div v-for="[childName, childSchema] in schemaObjectProperties(schemaItem)" :key="childName">
                        <div class="mb-2 flex items-center gap-1 text-sm text-gray-700">
                            <span>{{ childSchema.title || childName }}</span>
                            <span v-if="isObjectRequired(schemaItem, childName)" class="text-red-500">*</span>
                        </div>
                        <a-select
                            v-if="childSchema.enum && childSchema.enum.length"
                            :model-value="argumentsValue[name]?.[childName]"
                            allow-search
                            @update:model-value="updateObjectArgument(name, childName, $event)"
                        >
                            <a-option v-for="item in childSchema.enum" :key="String(item)" :value="item">
                                {{ String(item) }}
                            </a-option>
                        </a-select>
                        <a-switch
                            v-else-if="childSchema.type === 'boolean'"
                            :model-value="argumentsValue[name]?.[childName]"
                            @update:model-value="updateObjectArgument(name, childName, $event)"
                        />
                        <a-input-number
                            v-else-if="childSchema.type === 'number' || childSchema.type === 'integer'"
                            :model-value="argumentsValue[name]?.[childName]"
                            class="w-full"
                            @update:model-value="updateObjectArgument(name, childName, $event)"
                        />
                        <WorkflowVariableInput
                            v-else
                            :model-value="argumentsValue[name]?.[childName]"
                            :variables="variables"
                            :placeholder="childSchema.description || childName"
                            @update:model-value="updateObjectArgument(name, childName, $event)"
                        />
                        <div v-if="childSchema.description" class="mt-1 text-xs text-gray-500">
                            {{ childSchema.description }}
                        </div>
                    </div>
                </div>
                <WorkflowVariableInput
                    v-else
                    :model-value="argumentsValue[name]"
                    :variables="variables"
                    :placeholder="schemaItem.description || name"
                    @update:model-value="updateArgument(name, $event)"
                />
                <div v-if="schemaItem.description" class="mt-1 text-xs text-gray-500">
                    {{ schemaItem.description }}
                </div>
            </div>
        </div>

        <a-empty v-else :description="$t('workflow.noMcpArguments')" />
    </div>
</template>
