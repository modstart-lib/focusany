<script setup lang="ts">
import ModelSelector from "./ModelSelector.vue";
import {onMounted, ref, watch} from "vue";
import {StorageUtil} from "../../lib/storage";
import {useModelStore} from "./store/model";
import {StringUtil} from "../../lib/util";
import {ModelChatResult} from "./provider/provider";

const modelStore = useModelStore();
const selectedModel = ref<string>("");
const props = defineProps({
    biz: {
        type: String,
        default: "",
    },
});
watch(selectedModel, newValue => {
    if (props.biz) {
        StorageUtil.set(`ModelGenerator.${props.biz}`, newValue);
    }
});
onMounted(() => {
    if (props.biz) {
        selectedModel.value = StorageUtil.get(`ModelGenerator.${props.biz}`, "");
    }
});

const chat = async (
    prompt: string,
    param?: Record<string, any>,
    option?: {
        format?: "text" | "json";
    }
): Promise<ModelChatResult> => {
    option = Object.assign(
        {
            format: "text",
        },
        option
    );
    if (param) {
        prompt = StringUtil.replaceParam(prompt, param);
    }
    const [providerId, modelId] = (selectedModel.value || "|").split("|");
    const ret = await modelStore.chat(providerId, modelId, prompt);
    if (ret.code) {
        return ret;
    }
    try {
        ret.data.json = JSON.parse(ret.data.content);
    } catch (e) {
        ret.code = -1;
        ret.msg = t("解析返回数据失败");
    }
    return ret;
};
defineExpose({
    chat,
});
</script>

<template>
    <ModelSelector v-model="selectedModel" />
</template>
