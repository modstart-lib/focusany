<script setup lang="ts">
import {onBeforeMount, ref} from "vue";
import {PluginRecord, PluginState, PluginType} from "../types/Manager";
import {useDetachWindowOperate} from "./DetachWindow/operate";
import debounce from "lodash/debounce";
import {useSettingStore} from "../store/modules/setting";

const setting = useSettingStore()

const settingDummy = setting

// const id = ref('')
const isOsx = ref(false)
const isFullscreen = ref(false)
const plugin = ref<PluginRecord | null>(null)
const alwaysOnTop = ref(false)
const searchInput = ref<any>(null)
const searchPlaceholder = ref('')
const searchValue = ref('')
const searchVisible = ref(false)

const subInputChangeDebounce = debounce((keywords) => {
    window.$mapi.manager.subInputChange(keywords)
}, 300)

onBeforeMount(async () => {
    isOsx.value = window.$mapi.app.isPlatform('osx')
})

const doToggleAlwaysOnTop = async () => {
    alwaysOnTop.value = await window.$mapi.manager.toggleDetachPluginAlwaysOnTop(!alwaysOnTop.value)
}

const onSubInputChange = (value: string) => {
    searchValue.value = value
    subInputChangeDebounce(value)
}

// const getId = () => id.value

const {
    doShowZoomMenu,
    doShowMoreMenu,
    doClose
} = useDetachWindowOperate({plugin})

window.__page.onPluginInit((data: {
    plugin: PluginRecord,
    state: PluginState,
    param: {
        alwaysOnTop: boolean
    }
}) => {
    // console.log('onPluginInit', data)
    plugin.value = data.plugin
    // id.value = data.param.id
    alwaysOnTop.value = data.param.alwaysOnTop
    searchValue.value = data.state.value
    searchPlaceholder.value = data.state.placeholder
})
window.__page.onSetSubInput((
    param: {
        placeholder: string,
        isFocus: boolean,
        isVisible: boolean,
    }
) => {
    searchPlaceholder.value = param.placeholder
    searchVisible.value = param.isVisible
})
window.__page.onRemoveSubInput(() => {
    searchPlaceholder.value = ''
})
window.__page.onSetSubInputValue((value: string) => {
    searchValue.value = value
})
window.__page.onMaximize(() => {
    console.log('onMaximize')
})
window.__page.onUnmaximize(() => {
    console.log('onUnmaximize')
})
window.__page.onEnterFullScreen(() => {
    isFullscreen.value = true
    console.log('onEnterFullScreen')
})
window.__page.onLeaveFullScreen(() => {
    isFullscreen.value = false
    console.log('onLeaveFullScreen')
})

</script>

<template>
    <div class="pb-page-detach-window"
         v-if="!!plugin"
         :class="{osx:isOsx,fullscreen:isFullscreen}">
        <div class="head">
            <div class="left">
                <div class="icon">
                    <img :src="plugin.logo"
                         :class="plugin.type===PluginType.SYSTEM?'dark:invert':'plugin-logo-filter'"
                    />
                </div>
                <div class="title">
                    {{ plugin.title }}
                </div>
            </div>
            <div class="search" v-if="searchVisible">
                <a-input ref="searchInput"
                         size="small"
                         @input="(e) => onSubInputChange(e)"
                         :model-value="searchValue"
                         :placeholder="searchPlaceholder">
                    <template #prefix>
                        <icon-search/>
                    </template>
                </a-input>
            </div>
            <div class="right">
                <a href="javascript:;"
                   @click="doToggleAlwaysOnTop"
                   :class="{active:alwaysOnTop}">
                    <icon-pushpin/>
                </a>
                <span class="line"></span>
                <a href="javascript:;"
                   @click="doShowZoomMenu">
                    <icon-zoom-in/>
                </a>
                <span class="line"></span>
                <a href="javascript:;"
                   @click="doShowMoreMenu">
                    <icon-more/>
                </a>
                <span class="line" v-if="!isOsx"></span>
                <a href="javascript:;"
                   v-if="!isOsx"
                   @click="doClose">
                    <icon-close/>
                </a>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
[data-theme="dark"] {
    .pb-page-detach-window {
        .head {
            background: #333333;
            color: #FFFFFF;

            .right {
                border-color: #666666;
            }
        }
    }
}

.pb-page-detach-window {
    &.osx {
        .head {
            padding-left: 80px;
        }

        &.fullscreen {
            .head {
                padding-left: 10px;
            }
        }
    }

    .head {
        padding: 0 10px;
        height: 40px;
        background: #FFFFFF;
        display: flex;
        align-items: center;
        -webkit-user-select: none;
        transition: padding-left 0.3s;

        .left {
            flex-grow: 1;
            display: flex;
            align-items: center;
            -webkit-app-region: drag;

            .icon {
                margin-right: 10px;

                img {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                }
            }

            .title {

            }
        }

        .search {
            //max-width: 15rem;
            padding-right: 10px;

            :deep(.arco-input-wrapper) {
                border-radius: 30px;
                padding: 0 10px;
                height: 30px;
            }
        }

        .right {
            border: 1px solid var(--color-border);
            height: 30px;
            line-height: 30px;
            border-radius: 15px;
            display: flex;
            align-items: center;
            background-color: var(--color-background);

            a {
                display: block;
                width: 30px;
                text-align: center;
                color: var(--color-text);

                &:hover, &.active {
                    color: var(--color-primary);
                }
            }

            .line {
                height: 15px;
                width: 1px;
                background-color: var(--color-border);
            }
        }
    }
}
</style>
