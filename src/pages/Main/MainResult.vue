<template>
    <div class="pb-result">
        <div style="height:60px;"></div>
        <div ref="groupContainer" class="group-container">
            <div v-if="!manager.activePlugin && showSearchActions.length" class="group">
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
                        <ResultItem :action="a" @click="doOpenAction(a)"/>
                    </div>
                </div>
            </div>
            <div v-if="!manager.activePlugin && showMatchActions.length" class="group">
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
                        <ResultItem :action="a" @click="doOpenAction(a)"/>
                    </div>
                </div>
            </div>
            <div v-if="!manager.activePlugin && showHistoryActions.length" class="group">
                <div class="group-title" @click="doHistoryActionExtend"
                     :class="!historyActionIsExtend?'has-more':''">
                    <div class="title">
                        <icon-history/>
                        最近使用
                    </div>
                    <div class="more" v-if="!historyActionIsExtend">
                        展开全部({{ manager.historyActions.length }})
                    </div>
                </div>
                <div class="group-items">
                    <div class="item" v-for="(a,aIndex) in showHistoryActions"
                         :class="{active: activeActionGroup === 'history' && actionActionIndex === aIndex}">
                        <ResultItem :action="a" @click="doOpenAction(a)"/>
                    </div>
                </div>
            </div>
            <div v-if="!manager.activePlugin && showPinActions.length" class="group">
                <div class="group-title" @click="doPinActionExtend"
                     :class="!pinActionIsExtend?'has-more':''">
                    <div class="title">
                        <i class="iconfont icon-pin"></i>
                        已固定
                    </div>
                    <div class="more" v-if="!pinActionIsExtend">
                        展开全部({{ manager.pinActions.length }})
                    </div>
                </div>
                <div class="group-items">
                    <div class="item" v-for="(a,aIndex) in showPinActions"
                         :class="{active: activeActionGroup === 'pin' && actionActionIndex === aIndex}">
                        <ResultItem :action="a" @click="doOpenAction(a)"/>
                    </div>
                </div>
            </div>
            <div v-if="!manager.activePlugin && !manager.searchLoading && !hasActions && manager.searchValue"
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
    </div>
</template>

<script lang="ts" setup>
import {ref} from "vue";
import {useResultResize, fireResultResize} from "./Lib/resultResize";
import {useResultOperate} from "./Lib/resultOperate";
import {useManagerStore} from "../../store/modules/manager";
import ResultItem from "./Components/ResultItem.vue";
import {SystemIcons} from "../../../electron/mapi/manager/system/asset/icon";

const manager = useManagerStore()

const {
    hasActions,
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
} = useResultOperate()

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

    .group {
        padding-top: 10px;

        .group-title {
            height: 30px;
            display: flex;
            align-items: center;
            padding: 0 10px;
            cursor: pointer;
            margin-bottom: 3px;

            &.has-more {
                &:hover {
                    background: #eee;
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
