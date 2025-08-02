<template>
    <a-config-provider :locale="locale" :global="true">
        <div ref="main" id="main">
            <FastPanelSearch ref="mainSearch" />
            <FastPanelResult ref="mainResult" />
        </div>
    </a-config-provider>
</template>

<script setup lang="ts">
import {useLocale} from "../app/locale";
import {ref} from "vue";
import FastPanelSearch from "./FastPanel/FastPanelSearch.vue";
import FastPanelResult from "./FastPanel/FastPanelResult.vue";
import MainSearch from "./Main/MainSearch.vue";
import MainResult from "./Main/MainResult.vue";
import {useSettingStore} from "../store/modules/setting";

const setting = useSettingStore();
const settingDummy = setting;

const {locale} = useLocale();

const main = ref<HTMLElement | null>(null);
const mainSearch = ref<InstanceType<typeof MainSearch> | null>(null);
const mainResult = ref<InstanceType<typeof MainResult> | null>(null);

window.__page.onShow(() => {
    mainSearch.value?.onShow();
});
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
