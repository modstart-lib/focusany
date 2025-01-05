<template>
    <div class="pb-search" @mousedown="onDragWindowMouseDown">
        <div class="content-left">
            <div v-if="!manager.activePlugin"
                 @click="doLogoClick"
                 class="logo">
                <img src="./../../assets/image/search-icon.svg"/>
            </div>
            <div
                v-if="!manager.activePlugin && (manager.currentFiles.length||manager.currentImage||manager.currentText)"
                class="attachment">
                <div v-if="manager.currentFiles.length>0" class="file">
                    <div class="type">
                        <FileExt :name="clipboardFilesInfo.extName"/>
                    </div>
                    <div class="title">{{ clipboardFilesInfo.name }}</div>
                    <div class="count" v-if="manager.currentFiles.length>1">
                        x{{ manager.currentFiles.length }}
                    </div>
                </div>
                <div v-else-if="manager.currentImage" class="image">
                    <img :src="manager.currentImage"/>
                </div>
                <div v-else-if="manager.currentText" class="text">
                    <i class="iconfont icon-text"></i>
                    <div class="content">
                        {{ manager.currentText }}
                    </div>
                </div>
                <div class="close text-gray-500 bg-gray-200 hover:bg-gray-500 hover:text-white"
                     @click="emit('onClose')">
                    <icon-close/>
                </div>
            </div>
            <div v-if="manager.activePlugin"
                 class="plugin bg-gray-200 dark:bg-gray-600">
                <div class="icon">
                    <img :src="manager.activePlugin.logo"
                         :class="manager.activePlugin.type===PluginType.SYSTEM?'dark:invert':'plugin-logo-filter'"/>
                </div>
                <div class="title">
                    {{ manager.activePlugin.title }}
                </div>
                <div class="close text-gray-500 hover:bg-gray-500 hover:text-white"
                     @click="emit('onClose')">
                    <icon-close/>
                </div>
            </div>
        </div>
        <div class="main-search">
            <a-input
                id="search"
                ref="mainInput"
                size="large"
                @input="(e) => onSearchValueChange(e)"
                @focus="onFocus"
                @keydown.left="(e) => onSearchKeydown(e, 'left')"
                @keydown.right="(e) => onSearchKeydown(e, 'right')"
                @keydown.down="(e) => onSearchKeydown(e, 'down')"
                @keydown.tab="(e) => onSearchKeydown(e, 'down')"
                @keydown.up="(e) => onSearchKeydown(e, 'up')"
                @keydown.esc="(e) => onSearchKeydown(e, 'esc')"
                @keypress.enter="(e) => onSearchKeydown(e, 'enter')"
                @keypress.space="(e) => onSearchKeydown(e, 'space')"
                @keydown="(e) => onSearchKeydown(e, 'custom')"
                @dblclick="onSearchDoubleClick"
                :model-value="manager.searchValue">
            </a-input>
            <div class="placeholder"
                 v-if="manager.searchValue===''">
                {{ manager.activePlugin ? manager.searchSubPlaceholder : manager.searchPlaceholder }}
            </div>
        </div>
        <div class="content-right"
             @click="doShowMenu">
            <div class="more" v-if="manager.activePlugin">
                <icon-more-vertical style="font-size:20px;"/>
            </div>
        </div>
        <div
            v-if="!!manager.notice && manager.notice.text"
            class="flex items-center bg-yellow-100 shadow leading-8 px-2 rounded-lg">
            <div class="mr-1">
                <icon-info-circle v-if="manager.notice.type==='info'"/>
                <icon-check-circle v-else-if="manager.notice.type==='success'"/>
                <icon-close-circle v-else-if="manager.notice.type==='error'"/>
            </div>
            <div>
                {{ manager.notice.text }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue';
import FileExt from "../../components/common/FileExt.vue";
import {useManagerStore} from "../../store/modules/manager";
import {useSearchOperate} from "./Lib/searchOperate";
import {EntryListener} from "./Lib/entryListener";
import {useDragWindow} from "../../app/dragWindow";
import {PluginType} from "../../types/Manager";

const mainInput = ref<any>(null);

const emit = defineEmits([
    'onInputKey',
    'onClose',
])

const manager = useManagerStore()

const {onDragWindowMouseDown} = useDragWindow({
    name: 'main',
    ignore: (e) => {
        return !!(e.target && ((e.target as any).tagName === 'INPUT'))
    },
});

const {
    onSearchKeydown,
    onSearchDoubleClick,
    doShowMenu,
    clipboardFilesInfo,
} = useSearchOperate(emit)

let input = {
    ele: null as any,
    context: null as any,
}

watch(() => manager.searchValue, (value) => {
    if (!input.ele) {
        input.ele = document.querySelector('.pb-search input[type="text"]')
        const canvas = document.createElement("canvas");
        input.context = canvas.getContext("2d") as any
        input.context.font = window.getComputedStyle(input.ele).font;
    }
    const width = input.context.measureText(value).width;
    input.ele.style.width = (width + 10) + 'px';
})

const onSearchValueChange = (value: string) => {
    manager.search(value);
};

const onShow = () => {
    mainInput.value.focus();
};

const doLogoClick = () => {
    window.focusany.redirect(['system', 'page-setting'])
}

const onFocus = () => {
    if (!manager.activePlugin) {
        EntryListener.prepareSearch({}).then()
    }
}

defineExpose({
    onShow,
});

</script>

<style scoped lang="less">
.pb-search {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    align-items: center;
    height: 60px;
    padding: 10px;
    background-color: var(--color-background);
    user-select: none;

    .content-left {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        border-radius: 30px;
        transition: all 0.2s;

        .logo {
            cursor: pointer;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            transition: box-shadow 0.5s;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);

            &:hover {
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
            }

            img {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: contain;
            }
        }

        .attachment {
            height: 36px;
            line-height: 36px;
            display: flex;
            align-items: center;
            margin-left: 5px;
            background: var(--color-background);
            position: relative;

            .close {
                position: absolute;
                right: 0;
                top: -4px;
            }

            .file {
                display: flex;
                align-items: center;
                margin-right: 5px;
                background: var(--color-background-content);
                border-radius: 5px;
                padding: 0 10px;

                .type {
                    width: 20px;
                    height: 20px;
                    margin-right: 5px;
                    font-size: 0;
                }

                .title {
                    color: #333;
                    font-weight: bold;
                }

                .count {
                    line-height: 20px;
                    color: #FFF;
                    background: #cf0707;
                    border-radius: 10px;
                    padding: 0 5px;
                    margin-left: 5px;
                    font-size: 12px;
                }
            }

            .image {
                margin-right: 5px;

                img {
                    max-height: 30px;
                    max-width: 60px;
                    border-radius: 5px;
                    box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
                    background-color: var(--color-background);
                }
            }

            .text {
                height: 30px;
                line-height: 30px;
                padding: 0 10px;
                margin-right: 5px;
                border-radius: 5px;
                box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
                background: var(--color-background-content);
                max-width: 10rem;
                display: flex;
                align-items: center;
                flex-wrap: nowrap;

                .iconfont {
                    flex-shrink: 0;
                    width: 20px;
                    height: 20px;
                    line-height: 20px;
                    display: block;
                }

                .content {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            }
        }

        .plugin {
            display: flex;
            align-items: center;
            margin-right: 5px;
            padding: 0 10px;
            height: 40px;
            border-radius: 20px;

            .icon {
                width: 20px;
                height: 20px;
                margin-right: 5px;

                img {
                    width: 20px;
                    height: 20px;
                    object-fit: contain;
                }
            }

            .title {
                line-height: 20px;
                font-weight: bold;
                margin-right: 5px;
            }

            .close {
                width: 20px;
                height: 20px;

                :deep(.arco-icon) {
                    width: 16px;
                    height: 16px;
                    margin: auto;
                }
            }
        }

        .close {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            cursor: pointer;
            padding: 0;
            font-size: 0;
            display: flex;

            :deep(.arco-icon) {
                width: 10px;
                height: 10px;
                margin: auto;
            }

            &:hover {
                background: rgba(255, 0, 0, 0.8);
            }
        }
    }

    .main-search {
        height: 40px !important;
        flex: 1;
        width: 0;
        position: relative;

        .placeholder {
            position: absolute;
            top: 0;
            left: 10px;
            line-height: 40px;
            font-size: 20px;
            color: #999;
            z-index: 0;
        }

        :deep(.arco-input-wrapper) {
            position: absolute;
            z-index: 1;
            height: 40px !important;
            box-sizing: border-box;
            border: none;
            outline: none;
            box-shadow: none !important;
            background-color: transparent;
            padding-left: 8px;
            cursor: default;
        }

        :deep(input) {
            cursor: text !important;
        }

        &:hover {
            background-color: transparent !important;
        }

        :deep(.arco-input) {
            font-size: 20px !important;
        }
    }

    .content-right {

    }

}
</style>
