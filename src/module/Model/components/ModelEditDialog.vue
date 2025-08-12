<script setup lang="ts">
import {ref} from "vue";
import {useModelStore} from "../store/model";
import {Model} from "../types";

const modelStore = useModelStore();
const props = defineProps({
    provider: {
        type: Object,
        default: () => {
            return null;
        },
    },
});
const visible = ref(false);
const data = ref({
    id: "",
    name: "",
    group: "",
});
const show = (model: Model) => {
    data.value.id = model.id;
    data.value.name = model.name;
    data.value.group = model.group;
    visible.value = true;
};
const doSubmit = () => {
    if (!data.value.id) {
        return;
    }
    modelStore.modelEdit(props.provider.id, data.value);
    visible.value = false;
};
defineExpose({
    show,
});
</script>

<template>
    <a-modal v-model:visible="visible" width="30rem" :esc-to-close="false" :mask-closable="false" title-align="start">
        <template #title>
            {{ $t("编辑模型") }}
        </template>
        <template #footer>
            <a-button @click="visible = false">{{ $t("取消") }}</a-button>
            <a-button type="primary" @click="doSubmit">{{ $t("确定") }}</a-button>
        </template>
        <div style="max-height: 50vh" class="overflow-y-auto">
            <a-form :model="data" label-align="left" class="mt-4">
                <a-form-item :label="$t('模型ID')" name="title" required>
                    <a-input
                        v-model:model-value="data.id"
                        readonly
                        disabled
                        :placeholder="$t('必填 如 gpt-3.5-turbo')"
                    />
                </a-form-item>
                <a-form-item :label="$t('模型名称')" name="title">
                    <a-input v-model:model-value="data.name" :placeholder="$t('例如 GPT-3.5')" />
                </a-form-item>
                <a-form-item :label="$t('分组名称')" name="type">
                    <a-input v-model:model-value="data.group" :placeholder="$t('例如 ChatGPT')" />
                </a-form-item>
            </a-form>
        </div>
    </a-modal>
</template>
