<template>
    <a-config-provider :locale="locale" :global="true">
        <div ref="main" id="main"
             :class="{'no-active-plugin': !manager.activePlugin}">
            <MainSearch ref="mainSearch" @onClose="onClose"/>
            <MainResult ref="mainResult"/>
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
import {ignoreNextResultResize} from "./pages/Main/Lib/resultResize";

const manager = useManagerStore();

const main = ref<HTMLElement | null>(null);
const mainSearch = ref<InstanceType<typeof MainSearch> | null>(null);
const mainResult = ref<InstanceType<typeof MainResult> | null>(null);

const {locale} = useLocale();

const {onKeyDown} = useMainOperate();

const onClose = () => {
    mainResult.value?.onClose();
};

window.__page.onShow(() => {
    // console.log('main.onShow')
    manager.showFirstRun = true;
    mainSearch.value?.onShow();
});
window.__page.onPluginInit(
    (data: {
        plugin: PluginRecord;
        param: {
            alwaysOnTop: boolean;
        };
    }) => {
        // console.log('main.onPluginInit', data)
        manager.setActivePluginLoading(true);
        manager.setActivePlugin(data.plugin);
        manager.setSubInput({
            placeholder: "",
            isFocus: false,
            isVisible: false,
        });
        manager.setSubInputValue("");
        mainSearch.value?.focus(true);
    }
);
window.__page.onPluginInitReady(() => {
    // console.log('main.onPluginInitReady')
    manager.setActivePluginLoading(false);
});
window.__page.onPluginAlreadyOpened(() => {
    // console.log('main.onPluginAlreadyOpened')
    manager.search("");
    manager.hideMainWindow();
});
window.__page.onPluginExit((data: { openForNext: boolean }) => {
    // console.log('main.onPluginExit', data);
    if (data.openForNext) {
        ignoreNextResultResize();
    }
    manager.setActivePlugin(null);
    manager.search("");
    mainResult.value?.onPluginExit();
    setTimeout(() => {
        if (manager.activePlugin) {
            return;
        }
        mainSearch.value?.focus(true);
    }, 100);
});
window.__page.onPluginDetached(() => {
    // console.log('main.onPluginDetached')
    manager.setActivePlugin(null);
    manager.search("");
    mainResult.value?.onPluginDetached();
});
window.__page.onDetachWindowClosed(async () => {
    if (!manager.activePlugin) {
        await manager.detachWindowActionsRefresh();
    }
});
window.__page.onPluginState(() => {
    return {
        value: manager.searchValue,
        placeholder: manager.searchSubPlaceholder,
    };
});
window.__page.onPluginCodeInit((data: {
    plugin: PluginRecord;
    type: 'list' | never,
    placeholder: string;
}) => {
    // console.log('main.onPluginCodeInit', data);
    manager.setActivePlugin(data.plugin, "code");
    manager.setActivePluginLoading(false);
    manager.setSubInput({
        placeholder: data.placeholder,
        isFocus: true,
        isVisible: true,
    });
    manager.actionCodeType = data.type;
    setTimeout(() => {
        mainSearch.value?.focus(false);
    }, 1000);
})
window.__page.onPluginCodeSetting((data: {
    loading?: boolean;
    error?: string;
    placeholder?: string;
}) => {
    // console.log('main.onPluginCodeData', data);
    if ('loading' in data) {
        manager.actionCodeLoading = data.loading || false;
    }
    if ('error' in data) {
        manager.actionCodeError = data.error || '';
    }
    if ('placeholder' in data) {
        manager.setSubInput({
            placeholder: data.placeholder as string,
            isFocus: true,
            isVisible: true,
        });
    }
});
window.__page.onPluginCodeData((data: {
    items: any[],
}) => {
    // console.log('main.onPluginCodeData', data);
    manager.actionCodeError = null;
    manager.actionCodeLoading = false;
    manager.actionCodeItems = data.items.map((o, oIndex) => {
        return {
            shortcutIndex: oIndex <= 8 ? oIndex + 1 : -1,
            ...o
        }
    });
    manager.actionCodeItemActiveId = data.items.length > 0 ? data.items[0].id : null;
});
window.__page.onPluginCodeExit(() => {
    // console.log('main.onPluginCodeExit');
    manager.setActivePlugin(null);
    manager.search("");
    mainResult.value?.onPluginExit();
    manager.actionCodeItems = []
    manager.actionCodeItemActiveId = null;
    manager.actionCodeType = null;
    setTimeout(() => {
        mainSearch.value?.focus(true);
    }, 1000);
});
window.__page.onSetSubInput((param: { placeholder: string; isFocus: boolean; isVisible: boolean }) => {
    // console.log('main.onSetSubInput', param)
    manager.setSubInput(param);
    if (param.isFocus) {
        setTimeout(() => {
            mainSearch.value?.focus(false);
        }, 1000);
    }
});
window.__page.onRemoveSubInput(() => {
    // console.log('main.onRemoveSubInput')
    manager.removeSubInput();
});
window.__page.onSetSubInputValue((value: string) => {
    // console.log('main.onSetSubInputValue', value)
    manager.setSubInputValue(value);
});

window.addEventListener("keydown", e => {
    const {resultKey} = onKeyDown(e);
    // console.log('main.onKeyDown', e, resultKey);
    if (resultKey) {
        mainResult.value?.onInputKey(resultKey);
    } else if (manager.activePlugin && manager.activePluginType === 'code') {
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
            mainResult.value?.onInputHotKey(e);
        }
    }
});
onMounted(() => {
    setTimeout(async () => {
        const checkAtLaunch = await window.$mapi.config.get("updaterCheckAtLaunch", "yes");
        if ("yes" !== checkAtLaunch) {
            return;
        }
        doCheckForUpdate().then();
    }, 6000);
});
</script>

<style lang="less">
@mainBorderRadius: 15px;
#main {
    height: 100vh;
    overflow: hidden;
    border-radius: @mainBorderRadius;
    background: #FFFFFF;

    &.no-active-plugin {
        &::before {
            content: "";
            position: absolute;
            inset: 0;
            padding: 4px;
            border-radius: @mainBorderRadius;
            background-image: linear-gradient(130deg, #a8c8f4, #61c4f5, #ba59ff);
            background-size: 300% 300%;
            animation: border-flow 2s linear infinite;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            pointer-events: none;
        }

        @keyframes border-flow {
            0% {
                background-position: 0% 50%;
            }
            50% {
                background-position: 100% 50%;
            }
            100% {
                background-position: 0% 50%;
            }
        }
    }
}

[data-theme="dark"] {
    #main {
        background: #1e1e1e;
    }
}
</style>
