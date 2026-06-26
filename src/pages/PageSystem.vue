<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { SystemIcons } from '../../electron/mapi/manager/system/asset/icon'
import { testActionSet, testActionUnset } from '../utils/test'
import SystemAction from './System/SystemAction.vue'
import SystemData from './System/SystemData.vue'
import SystemFile from './System/SystemFile.vue'
import SystemLaunch from './System/SystemLaunch.vue'
import SystemMCP from './System/SystemMCP.vue'
import SystemModel from './System/SystemModel.vue'
import SystemPlugin from './System/SystemPlugin.vue'
import SystemSetting from './System/SystemSetting.vue'
import SystemUser from './System/SystemUser.vue'
const tab = ref('setting')
const doOpenWorkflow = async () => {
    await window.$mapi.manager.openPlugin('workflow')
}
window.focusany.onPluginReady((data) => {
    const actionNameMap = {
        'page-data': 'data',
        'page-setting': 'setting',
        'page-plugin': 'plugin',
        'page-action': 'action',
        'page-file': 'file',
        'page-launch': 'launch',
        'page-model': 'model',
        'page-mcp': 'mcp',
        'page-user': 'user',
    }
    if (actionNameMap[data.actionName]) {
        tab.value = actionNameMap[data.actionName]
    }
})
onMounted(() => {
    testActionSet('pageSystem.switchTab', async (tabName: string) => {
        tab.value = tabName
        await nextTick()
        await new Promise((resolve) => setTimeout(resolve, 100))
    })
    testActionSet('pageSystem.openWorkflow', doOpenWorkflow)
})
onUnmounted(() => {
    testActionUnset(['pageSystem.switchTab', 'pageSystem.openWorkflow'])
})
</script>

<template>
    <div class="flex h-dvh border-t border-default">
        <div class="w-48 flex-shrink-0 border-r border-solid border-default h-full p-3 overflow-y-auto select-none">
            <div class="text-gray-600 dark:text-gray-300 pb-4 px-4 py-4">{{ $t('system.preferences') }}</div>
            <div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'setting'"
                    :class="
                        tab === 'setting' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    "
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.pluginSystem" />
                    {{ $t('system.functionSettings') }}
                </div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'plugin'"
                    :class="
                        tab === 'plugin' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    "
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.plugin" />
                    {{ $t('system.pluginManagement') }}
                </div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'action'"
                    :class="
                        tab === 'action' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    "
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.command" />
                    {{ $t('system.actionManagement') }}
                </div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'file'"
                    :class="
                        tab === 'file' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    "
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.folder" />
                    {{ $t('system.fileLaunch') }}
                </div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'launch'"
                    :class="
                        tab === 'launch' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    "
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.thunder" />
                    {{ $t('system.hotkeys') }}
                </div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'model'"
                    :class="
                        tab === 'model' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    "
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.model" />
                    {{ $t('system.aiModel') }}
                </div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    @click="doOpenWorkflow"
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.pluginWorkflow" />
                    {{ $t('workflow.workflow') }}
                </div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'mcp'"
                    :class="tab === 'mcp' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'"
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.mcp" />
                    MCP
                </div>
                <div class="text-gray-600 dark:text-gray-300 pb-4 px-4 py-4">{{ $t('system.personalCenter') }}</div>
                <div>
                    <div
                        class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                        @click="tab = 'user'"
                        :class="
                            tab === 'user' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                        "
                    >
                        <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.user" />
                        {{ $t('system.myAccount') }}
                    </div>
                    <div
                        class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                        @click="tab = 'data'"
                        :class="
                            tab === 'data' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                        "
                    >
                        <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.database" />
                        {{ $t('system.dataCenter') }}
                    </div>
                </div>
            </div>
        </div>
        <div class="flex-grow overflow-y-auto">
            <SystemUser v-if="tab === 'user'" />
            <SystemData v-else-if="tab === 'data'" />
            <SystemSetting v-else-if="tab === 'setting'" />
            <SystemPlugin v-else-if="tab === 'plugin'" />
            <SystemAction v-else-if="tab === 'action'" />
            <SystemFile v-else-if="tab === 'file'" />
            <SystemLaunch v-else-if="tab === 'launch'" />
            <SystemModel v-else-if="tab === 'model'" />
            <SystemMCP v-else-if="tab === 'mcp'" />
        </div>
    </div>
</template>

<style scoped lang="less"></style>
