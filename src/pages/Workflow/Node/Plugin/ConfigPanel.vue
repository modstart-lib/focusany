<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import MCPParam, { McpInputSchema } from '../../components/MCPParam.vue'
import { WorkflowNode } from '../../types'
import { WorkflowVariableOption } from '../../variable'

type McpTool = {
    name: string
    description?: string
    inputSchema?: McpInputSchema
}

const props = defineProps<{
    selectedNode: WorkflowNode
    variables?: WorkflowVariableOption[]
}>()

const tools = ref<McpTool[]>([])
const loading = ref(false)

const ensureArguments = () => {
    if (!props.selectedNode.properties.arguments) {
        props.selectedNode.properties.arguments = {}
    }
}

const splitToolName = (name: string) => {
    const index = name.indexOf('-')
    if (index <= 0) return { pluginName: '', toolName: name }
    return {
        pluginName: name.slice(0, index),
        toolName: name.slice(index + 1),
    }
}

const selectedToolName = computed({
    get() {
        const properties = props.selectedNode.properties
        if (properties.mcpToolName) return properties.mcpToolName
        if (properties.pluginName && properties.toolName) return `${properties.pluginName}-${properties.toolName}`
        return ''
    },
    set(value: string) {
        const { pluginName, toolName } = splitToolName(value)
        props.selectedNode.properties.mcpToolName = value
        props.selectedNode.properties.pluginName = pluginName
        props.selectedNode.properties.toolName = toolName
        ensureArguments()
    },
})

const selectedTool = computed(() => {
    const name = selectedToolName.value
    const properties = props.selectedNode.properties
    return (
        tools.value.find((tool) => tool.name === name) ||
        tools.value.find((tool) => {
            const split = splitToolName(tool.name)
            return split.pluginName === properties.pluginName && split.toolName === properties.toolName
        }) ||
        null
    )
})

const hasSchemaProperties = computed(() => {
    return Object.keys(selectedTool.value?.inputSchema?.properties || {}).length > 0
})

const selectedInputSchema = computed(() => selectedTool.value?.inputSchema || { type: 'object', properties: {} })

const loadTools = async () => {
    loading.value = true
    try {
        let info = await window.$mapi.manager.getMcpInfo()
        tools.value = info.tools || []
        const pluginName = props.selectedNode.properties.pluginName
        const pluginTools = tools.value.filter((tool) => splitToolName(tool.name).pluginName === pluginName)
        const shouldRefresh = pluginName && (pluginTools.length <= 1 || !selectedTool.value?.inputSchema?.properties)
        if (shouldRefresh) {
            await window.$mapi.manager.refreshInstallPlugin(pluginName).catch(() => {})
            info = await window.$mapi.manager.getMcpInfo()
            tools.value = info.tools || []
        }
        if (!selectedToolName.value && tools.value.length) selectedToolName.value = tools.value[0].name
    } finally {
        loading.value = false
    }
}

watch(selectedTool, ensureArguments)

ensureArguments()
onMounted(loadTools)
</script>

<template>
    <div>
        <div class="mb-2 text-sm text-gray-700">{{ $t('workflow.mcpToolName') }}</div>
        <a-select v-model="selectedToolName" :loading="loading" allow-search>
            <a-option v-for="tool in tools" :key="tool.name" :value="tool.name">
                {{ tool.name }}
            </a-option>
        </a-select>
        <div class="mt-1 text-xs text-gray-400">共 {{ tools.length }} 个 MCP 方法</div>
        <div v-if="selectedTool?.description" class="mt-2 text-xs text-gray-500">
            {{ selectedTool.description }}
        </div>
    </div>

    <MCPParam
        v-if="hasSchemaProperties"
        :key="selectedToolName"
        v-model="selectedNode.properties.arguments"
        :schema="selectedInputSchema"
        :variables="variables || []"
    />
    <a-empty v-else :description="$t('workflow.noMcpArguments')" />
</template>
