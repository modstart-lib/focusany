<script setup lang="ts">
import {ref} from "vue";
import {SystemIcons} from "../../electron/mapi/manager/system/asset/icon";
import SystemAction from "./System/SystemAction.vue";
import SystemData from "./System/SystemData.vue";
import SystemFile from "./System/SystemFile.vue";
import SystemLaunch from "./System/SystemLaunch.vue";
import SystemPlugin from "./System/SystemPlugin.vue";
import SystemSetting from "./System/SystemSetting.vue";
import SystemUser from "./System/SystemUser.vue";
import SystemAbout from "./System/SystemAbout.vue";
const tab = ref("");
window.focusany.onPluginReady(data => {
    const actionNameMap = {
        "page-data": "data",
        "page-setting": "setting",
        "page-plugin": "plugin",
        "page-action": "action",
        "page-file": "file",
        "page-launch": "launch",
        "page-about": "about",
    };
    if (actionNameMap[data.actionName]) {
        tab.value = actionNameMap[data.actionName];
    }
});
</script>

<template>
    <div class="flex h-dvh border-t border-default">
        <div class="w-48 flex-shrink-0 border-r border-solid border-default h-full p-3 overflow-y-auto select-none">
            <div class="text-gray-600 dark:text-gray-300 pb-4 px-4 py-4">{{ $t("偏好设置") }}</div>
            <div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'setting'"
                    :class="
                        tab === 'setting' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    "
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.pluginSystem" />
                    功能设置
                </div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'plugin'"
                    :class="
                        tab === 'plugin' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    "
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.plugin" />
                    插件管理
                </div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'action'"
                    :class="
                        tab === 'action' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    "
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.command" />
                    动作管理
                </div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'file'"
                    :class="
                        tab === 'file' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    "
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.folder" />
                    文件启动
                </div>
                <div
                    class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                    @click="tab = 'launch'"
                    :class="
                        tab === 'launch' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    "
                >
                    <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.thunder" />
                    快捷启动
                </div>
                <div class="text-gray-600 dark:text-gray-300 pb-4 px-4 py-4">{{ $t("个人中心") }}</div>
                <div>
                    <div
                        class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                        @click="tab = 'data'"
                        :class="
                            tab === 'data' ? 'bg-gray-200 dark:bg-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                        "
                    >
                        <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.database" />
                        数据中心
                    </div>
                    <div
                        class="flex items-center leading-10 py-1 px-1 rounded-lg cursor-pointer"
                        @click="tab = 'about'"
                        :class="
                            tab === 'about'
                                ? 'bg-gray-200 dark:bg-gray-500'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                        "
                    >
                        <img class="w-6 h-6 object-contain mr-2 ml-2 dark:invert" :src="SystemIcons.about" />
                        关于我们
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
            <SystemAbout v-else-if="tab === 'about'" />
        </div>
    </div>
</template>

<style scoped lang="less"></style>
