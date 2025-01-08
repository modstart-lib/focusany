<template>
    <div class="pb-result">
        <div style="height:60px;"></div>
        <div ref="groupContainer">
            <div class="group-container"
                 :class="{'has-actions':hasActions,'has-view-actions':hasViewActions}"
                 v-if="!manager.activePlugin">
                <div class="group-main">
                    <div v-if="showSearchActions.length" class="group">
                        <div class="group-title" @click="doSearchActionExtend"
                             :class="!searchActionIsExtend?'has-more':''">
                            <div class="title">
                                <img draggable="false" :src="SystemIcons.searchKeyword"/>
                                搜索结果
                            </div>
                            <div class="more" v-if="!searchActionIsExtend">
                                展开全部({{ manager.searchActions.length }})
                            </div>
                        </div>
                        <div class="group-items">
                            <div class="item" v-for="(a,aIndex) in showSearchActions"
                                 :class="{active: activeActionGroup === 'search' && actionActionIndex === aIndex}">
                                <ResultItem :action="a" @open="doOpenAction(a)"
                                            :show-pin="!a.runtime?.isPined" @pin="doPinToggle(a)"
                                />
                            </div>
                        </div>
                    </div>
                    <div v-if="showMatchActions.length" class="group">
                        <div class="group-title" @click="doMatchActionExtend"
                             :class="!matchActionIsExtend?'has-more':''">
                            <div class="title">
                                <img :src="SystemIcons.searchMatch"/>
                                匹配结果
                            </div>
                            <div class="more" v-if="!matchActionIsExtend">
                                展开全部({{ manager.matchActions.length }})
                            </div>
                        </div>
                        <div class="group-items">
                            <div class="item" v-for="(a,aIndex) in showMatchActions"
                                 :class="{active: activeActionGroup === 'match' && actionActionIndex === aIndex}">
                                <ResultItem :action="a" @open="doOpenAction(a)"
                                            :show-pin="!a.runtime?.isPined" @pin="doPinToggle(a)"
                                />
                            </div>
                        </div>
                    </div>
                    <div v-if="showHistoryActions.length" class="group">
                        <div class="group-title"
                             :class="!historyActionIsExtend?'has-more':''">
                            <div class="title">
                                <icon-history/>
                                最近使用
                            </div>
                            <div class="more">
                                <a href="javascript:;"
                                   class="auto-hide"
                                   @click="doHistoryClear">
                                    <icon-delete/>
                                </a>
                                <a href="javascript:;" v-if="!historyActionIsExtend" @click="doHistoryActionExtend">
                                    展开全部({{ manager.historyActions.length }})
                                </a>
                            </div>
                        </div>
                        <div class="group-items">
                            <div class="item" v-for="(a,aIndex) in showHistoryActions"
                                 :class="{active: activeActionGroup === 'history' && actionActionIndex === aIndex}">
                                <ResultItem :action="a" @open="doOpenAction(a)"
                                            :show-pin="!a.runtime?.isPined" @pin="doPinToggle(a)"
                                            show-delete @delete="doHistoryDelete(a)"/>
                            </div>
                        </div>
                    </div>
                    <div v-if="showPinActions.length" class="group">
                        <div class="group-title"
                             :class="!pinActionIsExtend?'has-more':''">
                            <div class="title">
                                <i class="iconfont icon-pin"></i>
                                已固定
                            </div>
                            <div class="more">
                                <a href="javascript:;" v-if="!pinActionIsExtend" @click="doPinActionExtend">
                                    展开全部({{ manager.pinActions.length }})
                                </a>
                            </div>
                        </div>
                        <div class="group-items">
                            <div class="item" v-for="(a,aIndex) in showPinActions"
                                 :class="{active: activeActionGroup === 'pin' && actionActionIndex === aIndex}">
                                <ResultItem :action="a" @open="doOpenAction(a)" show-pin @pin="doPinToggle(a)"/>
                            </div>
                        </div>
                    </div>
                    <div
                        v-if="!manager.activePlugin && !manager.searchLoading && !hasActions && manager.searchValue"
                        class="group">
                        <div class="group-title">
                            <div class="title">
                                <icon-search/>
                                搜索结果
                            </div>
                        </div>
                        <div class="text-center" style="height:250px;">
                            <div class="py-4">
                                <m-empty/>
                            </div>
                        </div>
                    </div>
                    <div v-if="!manager.activePlugin && hasActions" style="height:10px;"></div>
                </div>
                <div class="group-right" v-if="viewActions.length>0">
                    <div class="view" v-if="viewActions.length">
                        <div v-for="r in viewActions"
                             class="view-item">
                            <div class="view-item-head">
                                <div class="icon">
                                    <img :src="r.icon"
                                         :class="r.pluginType===PluginType.SYSTEM?'dark:invert':'plugin-logo-filter'"/>
                                </div>
                                <div class="text">
                                    {{ r.title }}
                                </div>
                                <div v-if="0" class="action">
                                    <a href="javascript:;">
                                        关闭
                                    </a>
                                    <a href="javascript:;">
                                        <icon-more-vertical/>
                                    </a>
                                </div>
                            </div>
                            <div class="view-item-body">
                                <webview class="web"
                                         :ref="el=>(r['_web']=el)"
                                         :style="{height: r['_height'] + 'px'}"
                                         :id="r.fullName"
                                         :preload="r.runtime?.view?.preloadBase"
                                         :src="r.runtime?.view?.mainView"
                                         :nodeintegration="r.runtime?.view?.nodeIntegration"
                                         :useragent="`${webUserAgent} PluginAction/${r.fullName}`"
                                         webpreferences="contextIsolation=false,sandbox=false"
                                         disablewebsecurity></webview>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {ref} from "vue";
import {fireResultResize, useResultResize} from "./Lib/resultResize";
import {useResultOperate} from "./Lib/resultOperate";
import {useManagerStore} from "../../store/modules/manager";
import ResultItem from "./Components/ResultItem.vue";
import {SystemIcons} from "../../../electron/mapi/manager/system/asset/icon";
import {useViewOperate} from "./Lib/viewOperate";
import {PluginType} from "../../types/Manager";

const manager = useManagerStore()

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
    showSearchActions,
    showMatchActions,
    showHistoryActions,
    showPinActions,
    activeActionGroup,
    actionActionIndex,
    doActionNavigate,
    getActiveAction,
    onInputKey,
    onClose,
    doOpenAction,
    doHistoryClear,
    doHistoryDelete,
    doPinToggle,
} = useResultOperate()

const {
    webUserAgent,
    viewActions,
} = useViewOperate('main')

const emit = defineEmits([])

const groupContainer = ref<HTMLElement | null>(null);
useResultResize(groupContainer)

const onPluginExit = () => {
    fireResultResize(groupContainer)
}

const onPluginDetached = () => {
    fireResultResize(groupContainer)
}

defineExpose({
    onInputKey,
    onClose,
    onPluginExit,
    onPluginDetached,
})

</script>

<style lang="less" scoped>
.pb-result {
    overflow-y: auto;
    overflow-x: hidden;
    max-height: calc(100vh);
    user-select: none;

    .group-container {
        display: flex;

        &.has-actions.has-view-actions {
            .group-items {
                .item {
                    width: 18.8%;
                }
            }
        }

        .group-main {
            flex-grow: 1;
        }

        .group-right {
            width: 260px;
            border-left: 1px solid var(--color-border);
            border-top: 1px solid var(--color-border);
            border-radius: 0.5rem 0 0 0;
            flex-shrink: 0;

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
                .web {
                    transition: height 0.3s;
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

                img, .iconfont, svg {
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
                width: 12.5%;

                height: 100px;
                flex-shrink: 0;
                text-align: center;

                &:active {
                    :deep(.item-box) {
                        background-color: #f8dfab;
                    }
                }

                &.active {
                    :deep(.item-box) {
                        background-color: #f8dfab;
                    }
                }

            }
        }
    }
}

[data-theme="dark"] {
    .pb-result {
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
