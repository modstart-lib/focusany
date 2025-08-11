<script setup lang="ts">
import {computed} from "vue";

const props = defineProps<{
    type: ActionTypeEnum | undefined;
}>();
import {ActionTypeEnum} from "../../../types/Manager";
import {t} from "../../../lang";

const typeTitle = computed(() => {
    switch (props.type) {
        case ActionTypeEnum.WEB:
            return t("网页");
        case ActionTypeEnum.COMMAND:
            return t("命令");
        case ActionTypeEnum.VIEW:
            return t("智能区域");
        case ActionTypeEnum.CODE:
            return t("代码");
        case ActionTypeEnum.BACKEND:
            return t("后端代码");
        default:
            return "";
    }
});
</script>

<template>
    <div v-if="type !== ActionTypeEnum.WEB">
        <a-tooltip :content="typeTitle">
            <i class="iconfont" :class="`icon-${type}`"></i>
        </a-tooltip>
    </div>
</template>
