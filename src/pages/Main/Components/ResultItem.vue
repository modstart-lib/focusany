<script setup lang="ts">
import {PropType} from "vue";
import {ActionRecord, PluginType} from "../../../types/Manager";

const props = defineProps({
    action: {
        type: Object as PropType<ActionRecord>,
        required: true,
    },
})
</script>

<template>
    <div class="item-box hover:bg-gray-100 dark:hover:bg-gray-700">
        <div class="icon">
            <img draggable="false"
                 :class="action.pluginType===PluginType.SYSTEM?'dark:invert':'plugin-logo-filter'"
                 :src="action.icon"/>
        </div>
        <div class="title">
            <span v-if="action.runtime?.searchTitleMatched"
                  v-html="action.runtime?.searchTitleMatched"></span>
            <span v-else>{{ action.title }}</span>
        </div>
        <div v-if="0" class="text-xs">
            {{ action.name }}
        </div>
    </div>
</template>

<style lang="less" scoped>
.item-box {
    height: 100px;
    border-radius: 10px;
    cursor: pointer;
    padding-top: 15px;

    :deep(mark) {
        color: red;
        background: none;
    }

    .icon {
        text-align: center;

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
    }
}
</style>
