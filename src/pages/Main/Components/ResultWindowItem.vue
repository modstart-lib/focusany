<script setup lang="ts">
import {PropType} from "vue";
import {ActionRecord, PluginType} from "../../../types/Manager";

const emit = defineEmits([
    'open',
    'delete',
    'pin',
])
const props = defineProps({
    action: {
        type: Object as PropType<ActionRecord>,
        required: true,
    },
    showDelete: {
        type: Boolean,
        default: false,
    },
    showPin: {
        type: Boolean,
        default: false,
    }
})
</script>

<template>
    <div class="item-window-box hover:bg-gray-100 dark:hover:bg-gray-700" :data-action="action.fullName">
        <div class="icon" @click="emit('open')">
            <img draggable="false"
                 :class="action.pluginType===PluginType.SYSTEM?'dark:invert':'plugin-logo-filter'"
                 :src="action.icon"/>
        </div>
        <div class="title" @click="emit('open')">
            <span v-if="action.runtime?.searchTitleMatched"
                  v-html="action.runtime?.searchTitleMatched"></span>
            <span v-else>{{ action.title }}</span>
        </div>
        <div class="index" v-if="action.runtime?.windowCount&&action.runtime?.windowCount>1">
            {{ action.runtime?.windowIndex }}
        </div>
        <div class="action" v-if="showDelete || showPin">
            <a href="javascript:;" v-if="showDelete" @click="emit('delete')">
                <icon-delete/>
            </a>
            <a href="javascript:;" v-if="showPin" @click="emit('pin')">
                <i class="iconfont icon-pin"></i>
            </a>
        </div>
    </div>
</template>

<style lang="less" scoped>
.item-window-box {
    height: 90px;
    border-radius: 10px;
    position: relative;
    padding-top: 4px;
    border: 2px solid #EEE;
    border-top-width: 8px;
    margin-right: 5px;

    &:hover {
        .action {
            display: block;
        }
    }

    .action {
        position: absolute;
        top: 0;
        right: 0;
        cursor: default;
        display: none;

        a {
            display: inline-block;
            width: 20px;
            height: 20px;
            line-height: 20px;
            text-align: center;
            color: #999;

            &:hover {
                color: var(--color-primary);
            }
        }
    }

    .index {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 20px;
        height: 20px;
        line-height: 20px;
        text-align: center;
        color: #FFF;
        background-color: #999;
        font-size: 12px;
        border-radius: 50%;
    }

    :deep(mark) {
        color: red;
        background: none;
    }

    .icon {
        text-align: center;
        cursor: pointer;

        img {
            height: 40px;
            width: 40px;
            margin: 0 auto;
        }
    }

    .title {
        margin-top: 5px;
        font-size: 14px;
        line-height: 16px;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 5px;
        // 2行自动换行
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        cursor: pointer;
    }
}
</style>
