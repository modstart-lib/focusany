<script setup lang="ts">
import {useManagerStore} from "../../store/modules/manager";
import {useSearchOperate} from "../Main/Lib/searchOperate";
import FileExt from "../../components/common/FileExt.vue";
import {EntryListener} from "../Main/Lib/entryListener";
import {useDragWindow} from "../../app/dragWindow";

const emit = defineEmits([])
const manager = useManagerStore()

const {
    clipboardFilesInfo,
} = useSearchOperate(emit)

const {onDragWindowMouseDown} = useDragWindow({
    name: 'fastPanel',
});

const onShow = () => {
    EntryListener.prepareSearch({
        isFastPanel: true,
    }).then()
};

defineExpose({
    onShow,
});

</script>

<template>
    <div class="pb-search" @click="onShow"
         @mousedown="onDragWindowMouseDown">
        <div class="left">
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
            <div v-else>
                快捷指令
            </div>
        </div>
        <div class="right">
            <div class="icon" @click="manager.showMainWindow()">
                <img src="./../../assets/image/logo.svg"/>
            </div>
        </div>
    </div>
</template>

<style scoped lang="less">
.pb-search {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    align-items: center;
    height: 40px;
    padding: 10px;
    background-color: var(--color-background);
    border-bottom: 1px solid var(--color-border);
    z-index: 10;
    user-select: none;

    .left {
        display: flex;
        align-items: center;
        flex-grow: 1;
        border-radius: 10px;
        height: 40px;
        width: 0;

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

        .file {
            display: flex;
            align-items: center;
            margin-right: 5px;
            border-radius: 5px;
            box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
            padding: 0 10px;
            height: 30px;
            background-color: var(--color-background);
            max-width: 90%;

            .type {
                width: 20px;
                height: 20px;
                margin-right: 5px;
            }

            .title {
                line-height: 20px;
                color: #333;
                font-weight: bold;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex-grow: 1;
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
    }

    .right {
        display: flex;
        align-items: center;
        width: 40px;
        flex-shrink: 0;
        justify-content: flex-end;

        .icon {
            cursor: pointer;

            &:hover {
                img {
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
                }
            }

            img {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                transition: box-shadow 0.5s;
                object-fit: contain;
            }
        }
    }
}
</style>
