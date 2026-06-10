<script setup lang="ts">
import { onBeforeMount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import IconWindowMaximize from '~icons/mdi/window-maximize'
import IconWindowMinimize from '~icons/mdi/window-minimize'
import AppQuitConfirm from '../components/AppQuitConfirm.vue'
import { AppConfig } from '../config'
import { isDev } from '../lib/env'
import PageNav from './../components/PageNav.vue'

const router = useRouter()
const appQuitConfirm = ref<InstanceType<typeof AppQuitConfirm> | null>(null)
const platformName = ref<'win' | 'osx' | 'linux' | null>(null)

const doQuit = async () => {
    await appQuitConfirm.value?.show()
}

onBeforeMount(() => {
    platformName.value = window.$mapi?.app?.platformName() ?? null
})

onMounted(() => {
    // document.body.setAttribute('arco-theme', 'dark')
})

const debugVisible = ref(false)
const currentRoute = ref('')
const doDebugCopyRoute = async () => {
    currentRoute.value = router.currentRoute.value.fullPath
    await window.$mapi.app.setClipboardText(currentRoute.value)
    window.$mapi.app.toast($t('common.copySuccess'), { status: 'success' })
}
const doDebugToggle = () => {
    currentRoute.value = router.currentRoute.value.fullPath
    debugVisible.value = !debugVisible.value
}
</script>
<template>
    <div class="window-container">
        <div class="window-header flex h-10 items-center border-b border-solid border-gray-200 dark:border-gray-800">
            <div class="window-header-title flex-grow flex items-center">
                <div class="pl-2 py-2">
                    <img src="/logo.svg" class="w-4 t-4" />
                </div>
                <div class="p-2 flex-grow">
                    {{ AppConfig.title }}
                </div>
            </div>
            <div class="p-1 leading-4">
                <div
                    class="inline-block w-6 h-6 leading-6 cursor-pointer hover:text-primary mr-1"
                    @click="$mapi.app.windowMin()"
                >
                    <IconWindowMinimize class="text-sm" />
                </div>
                <div
                    class="inline-block w-6 h-6 leading-6 cursor-pointer hover:text-primary mr-1"
                    @click="$mapi.app.windowMax()"
                >
                    <IconWindowMaximize class="text-sm" />
                </div>
                <div class="inline-block w-6 h-6 leading-6 cursor-pointer hover:text-red-500" @click="doQuit">
                    <icon-close class="text-sm" />
                </div>
            </div>
        </div>
        <div class="window-body">
            <div class="page-container flex">
                <div class="w-16 flex-shrink-0 h-full text-white" style="background-color: var(--color-bg-page-nav)">
                    <PageNav />
                </div>
                <div class="flex-grow overflow-y-auto">
                    <router-view></router-view>
                </div>
            </div>
        </div>
    </div>
    <AppQuitConfirm ref="appQuitConfirm" />
    <!-- 调试弹窗 -->
    <template v-if="isDev">
        <div class="fixed top-10 left-0 z-50">
            <a-button shape="circle" size="mini" class="opacity-50 hover:opacity-100" @click="doDebugToggle">
                <template #icon><icon-bug /></template>
            </a-button>
        </div>
        <div
            v-if="debugVisible"
            class="fixed top-14 left-4 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 w-80"
        >
            <div class="font-bold text-sm mb-2">{{ $t('debug.info') }}</div>
            <div class="flex items-center gap-2">
                <div class="text-xs text-gray-500 flex-grow truncate">{{ currentRoute }}</div>
                <a-button size="mini" @click="doDebugCopyRoute">
                    <template #icon><icon-copy /></template>
                    {{ $t('debug.copyRoute') }}
                </a-button>
            </div>
        </div>
    </template>
</template>
