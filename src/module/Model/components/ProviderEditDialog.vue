<script setup lang="ts">
import {ref} from "vue";
import {ProviderType} from "../types";
import {useModelStore} from "../store/model";

const modelStore = useModelStore();
const visible = ref(false);
const data = ref({
    id: "",
    title: "",
    type: "openai" as ProviderType,
});
const show = provider => {
    data.value.id = provider.id;
    data.value.title = provider.title;
    data.value.type = provider.type;
    visible.value = true;
};
const doSubmit = () => {
    if (!data.value.title) {
        return;
    }
    modelStore.edit(data.value);
    visible.value = false;
};
defineExpose({
    show,
});
</script>

<template>
    <a-modal v-model:visible="visible" width="30rem" :esc-to-close="false" :mask-closable="false" title-align="start">
        <template #title>
            {{ $t("编辑供应商") }}
        </template>
        <template #footer>
            <a-button @click="visible = false">{{ $t("取消") }}</a-button>
            <a-button type="primary" @click="doSubmit">{{ $t("确定") }}</a-button>
        </template>
        <div style="max-height: 50vh" class="overflow-y-auto">
            <a-form :model="data" label-align="left" class="mt-4">
                <a-form-item :label="$t('供应商名称')" name="title">
                    <a-input v-model:model-value="data.title" :placeholder="$t('供应商名称')" />
                </a-form-item>
                <a-form-item :label="$t('接口类型')" name="type">
                    <a-select v-model:model-value="data.type" :placeholder="$t('接口类型')">
                        <a-option value="openai">OpenAI</a-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </div>
    </a-modal>
</template>
