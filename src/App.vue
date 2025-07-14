<template>
    <a-config-provider :locale="locale" :global="true">
        <div ref="main" id="main">
            <MainSearch
                ref="mainSearch"
                @onClose="onClose"
            />
            <MainResult
                ref="mainResult"
            />
        </div>
    </a-config-provider>
</template>

<script setup lang="ts">
import {onMounted, ref} from "vue";

import MainSearch from "./pages/Main/MainSearch.vue";
import MainResult from "./pages/Main/MainResult.vue";
import {useManagerStore} from "./store/modules/manager";
import {PluginRecord} from "./types/Manager";
import {useLocale} from "./app/locale";
import {doCheckForUpdate} from "./components/common/util";
import {useMainOperate} from "./pages/Main/Lib/mainOperate";

const manager = useManagerStore()

const main = ref<HTMLElement | null>(null);
const mainSearch = ref<InstanceType<typeof MainSearch> | null>(null);
const mainResult = ref<InstanceType<typeof MainResult> | null>(null);

const {locale} = useLocale()

const {
    onKeyDown
} = useMainOperate()

const onClose = () => {
    mainResult.value?.onClose();
};

window.__page.onShow(() => {
    // console.log('main.onShow')
    mainSearch.value?.onShow();
})
window.__page.onPluginInit((data: {
    plugin: PluginRecord,
    param: {
        alwaysOnTop: boolean
    }
}) => {
    // console.log('main.onPluginInit', data)
    manager.setActivePlugin(data.plugin)
    manager.setSubInput({
        placeholder: '',
        isFocus: false,
    })
    manager.setSubInputValue('')
    mainSearch.value?.focus()
})
window.__page.onPluginAlreadyOpened(() => {
    // console.log('main.onPluginAlreadyOpened')
    manager.search('')
    manager.hideMainWindow()
})
window.__page.onPluginExit(() => {
    manager.setActivePlugin(null)
    manager.search('')
    mainResult.value?.onPluginExit();
    setTimeout(() => {
        if (manager.activePlugin) {
            return
        }
        mainSearch.value?.focus()
    }, 100);
})
window.__page.onPluginDetached(() => {
    // console.log('main.onPluginDetached')
    manager.setActivePlugin(null)
    manager.search('')
    mainResult.value?.onPluginDetached()
})
window.__page.onDetachWindowClosed(async () => {
    if (await manager.isMainWindowShown() && !manager.activePlugin) {
        await manager.detachWindowActionsRefresh()
    }
})
window.__page.onPluginState(() => {
    return {
        value: manager.searchValue,
        placeholder: manager.searchSubPlaceholder,
    }
})
window.__page.onSetSubInput((
    param: {
        placeholder: string,
        isFocus: boolean,
        isVisible: boolean,
    }
) => {
    // console.log('main.onSetSubInput', param)
    manager.setSubInput(param);
})
window.__page.onRemoveSubInput(() => {
    // console.log('main.onRemoveSubInput')
    manager.removeSubInput();
})
window.__page.onSetSubInputValue((value: string) => {
    // console.log('main.onSetSubInputValue', value)
    manager.setSubInputValue(value);
})


window.addEventListener('keydown', (e) => {
    const {resultKey} = onKeyDown(e)
    if (resultKey) {
        mainResult.value?.onInputKey(resultKey)
    }
})
onMounted(() => {
    setTimeout(async () => {
        const checkAtLaunch = await window.$mapi.config.get('updaterCheckAtLaunch', 'yes')
        if ('yes' !== checkAtLaunch) {
            return
        }
        doCheckForUpdate().then()
    }, 6000);
});
</script>

<style lang="less" scoped>
#main {
    height: 100vh;
    overflow: hidden;
}
</style>
