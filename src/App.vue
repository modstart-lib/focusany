<template>
    <a-config-provider :locale="locale" :global="true">
        <div ref="main" id="main">
            <MainSearch
                ref="mainSearch"
                @onInputKey="onInputKey"
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
import {PluginRecord, PluginState} from "./types/Manager";
import {useLocale} from "./app/locale";
import {doCheckForUpdate} from "./components/common/util";

const manager = useManagerStore()

const main = ref<HTMLElement | null>(null);
const mainSearch = ref<InstanceType<typeof MainSearch> | null>(null);
const mainResult = ref<InstanceType<typeof MainResult> | null>(null);

const {locale} = useLocale()

const onInputKey = (direction: string) => {
    mainResult.value?.onInputKey(direction);
};
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
    // console.log('main.onPluginExit')
    manager.setActivePlugin(null)
    manager.search('')
    mainResult.value?.onPluginExit();
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

let detachHotKey: any = null
let detachHotkeyExpire = 0
let detachHotkeyTimes = 0
window.addEventListener('keydown', (e) => {
    if (!detachHotKey) {
        detachHotKey = manager.configGet('detachWindowTrigger', null)
    }
    // console.log('keydown', detachHotKey.value, detachHotkeyExpire)
    // {"key":"D","altKey":false,"ctrlKey":false,"metaKey":true,"shiftKey":false,"times":1}
    if (detachHotKey && detachHotKey.value) {
        // console.log('detachHotkeyExpire', detachHotKey.value.key, detachHotkeyExpire)
        if (
            detachHotKey.value.key === e.key.toUpperCase()
            && detachHotKey.value.altKey === e.altKey
            && detachHotKey.value.ctrlKey === e.ctrlKey
            && detachHotKey.value.metaKey === e.metaKey
            && detachHotKey.value.shiftKey === e.shiftKey
        ) {
            if (!detachHotkeyExpire || Date.now() > detachHotkeyExpire) {
                detachHotkeyExpire = Date.now() + 500
                detachHotkeyTimes = 1
            } else {
                detachHotkeyTimes++
            }
            if (detachHotkeyTimes >= detachHotKey.value.times) {
                detachHotkeyExpire = 0
                detachHotkeyTimes = 0
                manager.detachPlugin()
                return
            }
        }
    }
    if (!manager.activePlugin) {
        mainSearch.value?.onKeyDown(e)
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
