<script setup lang="ts">
import {onMounted, ref} from "vue";
import {doCopy} from "../../components/common/util";

const mcpServer = ref('...')
const tools = ref<{
    name: string,
    description: string,
}[]>([])
onMounted(async () => {
    mcpServer.value = await window.$mapi.manager.getMcpServer()
    const mcpInfo = await window.$mapi.manager.getMcpInfo()
    tools.value = mcpInfo.tools
})
</script>

<template>
    <div class="overflow-x-hidden overflow-y-auto"
         style="height:calc(100vh - 1px);">
        <div class="p-4">
            <div class="flex items-center mb-4">
                <div class="flex-grow text-2xl">MCP</div>
                <div></div>
                <div>
                </div>
            </div>
            <div class="font-bold mb-4">MCP Server 地址</div>
            <div class="flex items-center mb-4">
                <div class="font-mono mr-2 bg-gray-100 px-2 rounded-lg leading-7">
                    {{ mcpServer }}
                </div>
                <div class="flex-grow">
                    <a-button size="mini" @click="doCopy(mcpServer)">
                        <template #icon>
                            <icon-copy/>
                        </template>
                    </a-button>
                </div>
            </div>
            <div class="font-bold mb-4">MCP Tools</div>
            <div class="mb-4">
                <div v-if="tools.length === 0" class="text-center py-2 text-gray-400 mb-2">
                    <icon-empty/>
                    暂无可用工具
                </div>
                <div v-for="tool in tools" :key="tool.name"
                     class="mb-2 p-2 border border-gray-300 rounded-lg hover:bg-gray-100">
                    <div class="font-bold">{{ tool.name }}</div>
                    <div class="text-sm text-gray-600">{{ tool.description }}</div>
                </div>
            </div>
        </div>
    </div>
</template>
