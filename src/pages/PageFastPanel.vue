<template>
    <a-config-provider :locale="locale" :global="true">
        <div ref="main" id="main">
            <FastPanelSearch ref="mainSearch" />
            <FastPanelResult ref="mainResult" />
        </div>
    </a-config-provider>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useLocale } from '../app/locale'
import FastPanelSearch from './FastPanel/FastPanelSearch.vue'
import FastPanelResult from './FastPanel/FastPanelResult.vue'
import MainSearch from './Main/MainSearch.vue'
import MainResult from './Main/MainResult.vue'
import { useSettingStore } from '../store/modules/setting'
import { useManagerStore } from '../store/modules/manager'
import { testActionSet, testActionUnset } from '../utils/test'

const setting = useSettingStore()
// do not remove this line, it is used to trigger the setting store to be initialized
const settingDummy = setting
const manager = useManagerStore()

const { locale } = useLocale()

const main = ref<HTMLElement | null>(null)
const mainSearch = ref<InstanceType<typeof MainSearch> | null>(null)
const mainResult = ref<InstanceType<typeof MainResult> | null>(null)

window.__page.onShow(() => {
    manager.showFirstRun = true
    mainSearch.value?.onShow()
})

onMounted(() => {
    testActionSet('pageFastPanel.loaded', () => true)
})

onBeforeUnmount(() => {
    testActionUnset('pageFastPanel.loaded')
})
</script>

<style lang="less" scoped>
#main {
    height: 100vh;
    overflow-x: hidden;
    overflow-y: visible;

    &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }

    &::-webkit-scrollbar-track {
        border-radius: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: #666;
        border-radius: 6px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #999;
    }
}
</style>
