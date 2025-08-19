<template>
    <div class="pb-result">
        <div ref="resultContainer">
            <ResultLoading v-if="manager.activePlugin && manager.activePluginLoading"/>
            <div
                class="action-container"
                :class="{'has-actions': hasActions, 'has-view-actions': hasViewActions}"
                v-else-if="!manager.activePlugin">
                <div class="group-main">
                    <div v-if="showDetachWindowActions.length" class="group">
                        <div class="group-title">
                            <div class="title">
                                <img draggable="false" class="dark:invert" :src="SystemIcons.searchWindow"/>
                                {{ $t('窗口') }}
                            </div>
                            <div class="more">&nbsp;</div>
                        </div>
                        <div class="group-items">
                            <div
                                class="item"
                                v-for="(a, aIndex) in showDetachWindowActions"
                                :class="{active: activeActionGroup === 'window' && actionActionIndex === aIndex}"
                            >
                                <ResultWindowItem :action="a" @open="openActionWindow('open', a)"/>
                            </div>
                        </div>
                    </div>
                    <div v-if="showSearchActions.length" class="group">
                        <div
                            class="group-title"
                            @click="doSearchActionExtend"
                            :class="!searchActionIsExtend ? 'has-more' : ''"
                        >
                            <div class="title">
                                <img draggable="false" class="dark:invert" :src="SystemIcons.searchKeyword"/>
                                {{ $t('搜索结果') }}
                            </div>
                            <div class="more" v-if="!searchActionIsExtend">
                                {{ $t('展开全部') }}({{ manager.searchActions.length }})
                            </div>
                        </div>
                        <div class="group-items">
                            <div
                                class="item"
                                v-for="(a, aIndex) in showSearchActions"
                                :class="{active: activeActionGroup === 'search' && actionActionIndex === aIndex}"
                            >
                                <ResultItem
                                    :action="a"
                                    @open="doOpenAction(a)"
                                    :show-pin="!a.runtime?.isPined"
                                    @pin="doPinToggle(a)"
                                />
                            </div>
                        </div>
                    </div>
                    <div v-if="showMatchActions.length" class="group">
                        <div
                            class="group-title"
                            @click="doMatchActionExtend"
                            :class="!matchActionIsExtend ? 'has-more' : ''"
                        >
                            <div class="title">
                                <img class="dark:invert" :src="SystemIcons.searchMatch"/>
                                {{ $t('匹配结果') }}
                            </div>
                            <div class="more" v-if="!matchActionIsExtend">
                                {{ $t('展开全部') }}({{ manager.matchActions.length }})
                            </div>
                        </div>
                        <div class="group-items">
                            <div
                                class="item"
                                v-for="(a, aIndex) in showMatchActions"
                                :class="{active: activeActionGroup === 'match' && actionActionIndex === aIndex}"
                            >
                                <ResultItem
                                    :action="a"
                                    @open="doOpenAction(a)"
                                    :show-pin="!a.runtime?.isPined"
                                    @pin="doPinToggle(a)"
                                />
                            </div>
                        </div>
                    </div>
                    <div v-if="showHistoryActions.length" class="group">
                        <div class="group-title" :class="!historyActionIsExtend ? 'has-more' : ''">
                            <div class="title">
                                <icon-history/>
                                {{ $t('最近使用') }}
                            </div>
                            <div class="more">
                                <a href="javascript:;" class="auto-hide" @click="doHistoryClear">
                                    <icon-delete/>
                                </a>
                                <a href="javascript:;" v-if="!historyActionIsExtend" @click="doHistoryActionExtend">
                                    {{ $t('展开全部') }}({{ manager.historyActions.length }})
                                </a>
                            </div>
                        </div>
                        <div class="group-items">
                            <div
                                class="item"
                                v-for="(a, aIndex) in showHistoryActions"
                                :class="{active: activeActionGroup === 'history' && actionActionIndex === aIndex}"
                            >
                                <ResultItem
                                    :action="a"
                                    @open="doOpenAction(a)"
                                    :show-pin="!a.runtime?.isPined"
                                    @pin="doPinToggle(a)"
                                    show-delete
                                    @delete="doHistoryDelete(a)"
                                />
                            </div>
                        </div>
                    </div>
                    <div v-if="showPinActions.length" class="group">
                        <div class="group-title" :class="!pinActionIsExtend ? 'has-more' : ''">
                            <div class="title">
                                <i class="iconfont icon-pin"></i>
                                {{ $t('已固定') }}
                            </div>
                            <div class="more">
                                <a href="javascript:;" v-if="!pinActionIsExtend" @click="doPinActionExtend">
                                    {{ $t('展开全部') }}({{ manager.pinActions.length }})
                                </a>
                            </div>
                        </div>
                        <div class="group-items">
                            <div
                                class="item"
                                v-for="(a, aIndex) in showPinActions"
                                :class="{active: activeActionGroup === 'pin' && actionActionIndex === aIndex}"
                            >
                                <ResultItem :action="a" @open="doOpenAction(a)" show-pin @pin="doPinToggle(a)"/>
                            </div>
                        </div>
                    </div>
                    <div
                        v-if="!manager.activePlugin && !manager.searchLoading && !hasActions && manager.searchValue"
                        class="group"
                    >
                        <div class="group-title">
                            <div class="title">
                                <icon-search/>
                                {{ $t('搜索结果') }}
                            </div>
                        </div>
                        <div class="text-center" style="height: 250px">
                            <div class="py-4">
                                <m-empty/>
                            </div>
                        </div>
                    </div>
                    <div v-if="!manager.activePlugin && hasActions" style="height: 10px"></div>
                </div>
                <div class="group-right" v-if="viewActions.length > 0">
                    <div class="view" v-if="viewActions.length">
                        <div v-for="r in viewActions" class="view-item">
                            <div class="view-item-head">
                                <div class="icon">
                                    <img
                                        :src="r.icon"
                                        :class="
                                            r.pluginType === PluginType.SYSTEM ? 'dark:invert' : 'plugin-logo-filter'
                                        "
                                    />
                                </div>
                                <div class="text">
                                    {{ r.title }}
                                </div>
                                <div v-if="0" class="action">
                                    <a href="javascript:;"> {{ $t('关闭') }} </a>
                                    <a href="javascript:;">
                                        <icon-more-vertical/>
                                    </a>
                                </div>
                            </div>
                            <div class="view-item-body">
                                <webview
                                    class="web"
                                    :ref="el => (r['_web'] = el)"
                                    :style="{height: r['_height'] + 'px'}"
                                    :id="r.fullName"
                                    :preload="r.runtime?.view?.preloadBase"
                                    :src="r.runtime?.view?.mainView"
                                    :nodeintegration="r.runtime?.view?.nodeIntegration"
                                    :useragent="`${webUserAgent} PluginAction/${r.fullName}`"
                                    webpreferences="contextIsolation=false,sandbox=false"
                                    disablewebsecurity
                                ></webview>
                                <div class="view-item-loading" v-if="!r['_webReady']">
                                    <icon-loading/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else-if="manager.activePlugin && manager.activePluginType==='code'">
                <ResultActionCodeLoading v-if="manager.actionCodeLoading"/>
                <ResultActionCodeItemList v-else-if="'list'===manager.actionCodeType"
                                          :do-open-action-code="doOpenActionCode"
                                          :is-osx="isOsx"
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {onBeforeMount, ref} from "vue";
import {fireResultResize, useResultResize} from "./Lib/resultResize";
import {useResultOperate} from "./Lib/resultOperate";
import {useManagerStore} from "../../store/modules/manager";
import ResultItem from "./Components/ResultItem.vue";
import {SystemIcons} from "../../../electron/mapi/manager/system/asset/icon";
import {useViewOperate} from "./Lib/viewOperate";
import {PluginType} from "../../types/Manager";
import ResultWindowItem from "./Components/ResultWindowItem.vue";
import ResultActionCodeLoading from "./Components/ResultActionCodeLoading.vue";
import ResultActionCodeItemList from "./Components/ResultActionCodeItemList.vue";
import ResultLoading from "./Components/ResultLoading.vue";

const manager = useManagerStore();

const {
    hasActions,
    hasViewActions,
    searchActionIsExtend,
    matchActionIsExtend,
    historyActionIsExtend,
    pinActionIsExtend,
    doSearchActionExtend,
    doMatchActionExtend,
    doHistoryActionExtend,
    doPinActionExtend,
    showDetachWindowActions,
    showSearchActions,
    showMatchActions,
    showHistoryActions,
    showPinActions,
    activeActionGroup,
    actionActionIndex,
    onInputKey,
    onClose,
    doOpenAction,
    doOpenActionCode,
    openActionWindow,
    doHistoryClear,
    doHistoryDelete,
    doPinToggle,
} = useResultOperate();

const isOsx = ref(false);

onBeforeMount(async () => {
    isOsx.value = window.$mapi.app.isPlatform("osx");
});

const {webUserAgent, viewActions} = useViewOperate("main");

const emit = defineEmits([]);

const resultContainer = ref<HTMLElement | null>(null);
useResultResize(resultContainer);

const onPluginExit = () => {
    fireResultResize(resultContainer);
};

const onPluginDetached = () => {
    fireResultResize(resultContainer);
};

const onInputHotKey = (e: KeyboardEvent) => {
    if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        let pass = false;
        if (isOsx.value) {
            if (e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                pass = true;
            }
        } else {
            if (e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                pass = true;
            }
        }
        if (pass) {
            const index = parseInt(e.key) - 1;
            if (manager.actionCodeItems.length > index) {
                const item = manager.actionCodeItems[index];
                if (item) {
                    doOpenActionCode(item.id);
                }
            }
        }
    }
};

defineExpose({
    onInputKey,
    onInputHotKey,
    onClose,
    onPluginExit,
    onPluginDetached,
});
</script>

<style lang="less" scoped>
.pb-result {
    overflow-y: auto;
    overflow-x: hidden;
    max-height: calc(100vh - 60px);
    user-select: none;

    &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }

    &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
        background: #aaaaaa;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #bbbbbb;
    }

    .action-container {
        display: flex;

        .group-main {
            flex-grow: 1;
        }

        .group-right {
            width: 260px;
            border-left: 1px solid var(--color-border);
            border-top: 1px solid var(--color-border);
            border-radius: 0.5rem 0 0 0;
            flex-shrink: 0;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
            margin-top: 5px;

            .view-item-head {
                display: flex;
                align-items: center;
                padding: 2px 5px;
                font-size: 12px;
                height: 26px;

                &:hover {
                    .action {
                        display: block;
                    }
                }

                .icon {
                    width: 16px;
                    height: 16px;
                    margin-right: 5px;

                    img {
                        width: 16px;
                        height: 16px;
                        object-fit: contain;
                    }
                }

                .text {
                    flex: 1;
                    user-select: none;
                }

                .action {
                    a {
                        display: inline-block;
                        border-radius: 5px;
                        height: 20px;
                        min-width: 20px;
                        text-align: center;
                        font-size: 10px;
                        line-height: 20px;
                        padding: 0 5px;
                        margin-left: 2px;

                        &:hover {
                            background: #f0f0f0;
                        }
                    }
                }
            }

            .view-item-body {
                position: relative;

                .web {
                    transition: height 0.3s;
                }

                .view-item-loading {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.8);
                    z-index: 1;
                }
            }
        }
    }

    .group {
        padding-top: 10px;

        .group-title {
            height: 30px;
            display: flex;
            align-items: center;
            padding: 0 10px;
            cursor: pointer;
            margin-bottom: 3px;

            &:hover {
                .more {
                    a.auto-hide {
                        display: inline-block;
                    }
                }
            }

            .title {
                flex-grow: 1;
                font-weight: bold;
                font-size: 16px;
                display: flex;
                align-items: center;

                img,
                .iconfont,
                svg {
                    width: 20px;
                    height: 20px;
                    object-fit: contain;
                    margin-right: 5px;
                    display: block;
                    line-height: 20px;
                    text-align: center;
                }
            }

            .more {
                color: #999;
                cursor: pointer;

                a {
                    display: inline-block;
                    padding: 0.1rem 0.3rem;
                    border-radius: 0.3rem;

                    &.auto-hide {
                        display: none;
                    }

                    &:hover {
                        background: #eee;
                    }
                }
            }
        }

        .group-items {
            display: flex;
            flex-wrap: wrap;
            padding: 0 10px;

            .item {
                width: 96px;
                //margin-right: 2px;
                height: 100px;
                flex-shrink: 0;
                text-align: center;

                &.active {
                    :deep(.item-box) {
                        background-color: #eeeeee;
                    }

                    :deep(.item-window-box) {
                        border-color: #eaa109;
                        background-color: #f8dfab;
                    }
                }
            }
        }
    }

}

[data-theme="dark"] {
    .pb-result {
        &::-webkit-scrollbar-track {
            background: #333;
        }

        &::-webkit-scrollbar-thumb {
            background: #555;
        }

        &::-webkit-scrollbar-thumb:hover {
            background: #777;
        }

        .group {
            .group-title {
                &.has-more {
                    &:hover {
                        background: #333;
                    }
                }
            }

            .group-items {
                .item {
                    &.active {
                        :deep(.item-box) {
                            background-color: #333;
                        }
                    }
                }
            }
        }
    }
}
</style>
