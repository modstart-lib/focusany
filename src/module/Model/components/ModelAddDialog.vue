<script setup lang="ts">
import { ref, watch } from 'vue'
import { useModelStore } from '../store/model'
import { t } from '../../../lang'
import ModalHeaderBar from '../../../components/ModalHeaderBar.vue'

const modelStore = useModelStore()
const props = defineProps({
    provider: {
        type: Object,
        default: () => {
            return null
        },
    },
})
const visible = ref(false)
const data = ref({
    id: '',
    name: '',
    group: '',
    caps: {
        vision: false,
        tools: false,
    },
})
watch(
    () => data.value.id,
    (val) => {
        data.value.name = data.value.id
        data.value.group = data.value.id
    },
)
const show = () => {
    data.value.id = ''
    data.value.name = ''
    data.value.group = ''
    data.value.caps = {
        vision: false,
        tools: false,
    }
    visible.value = true
}
const doSubmit = () => {
    if (!data.value.id) {
        throw new Error(`[ModelAddDialog] ${t('提交失败：模型ID为空')}`)
    }
    modelStore.modelAdd(props.provider.id, data.value)
    visible.value = false
}
const fill = (d: { id?: string; name?: string; group?: string }) => {
    if (d.id !== undefined) data.value.id = d.id
    if (d.name !== undefined) data.value.name = d.name
    if (d.group !== undefined) data.value.group = d.group
}
defineExpose({
    show,
    fill,
    doSubmit,
})
</script>

<template>
    <a-modal
        v-model:visible="visible"
        width="30rem"
        :esc-to-close="false"
        :mask-closable="false"
        title-align="start"
        :closable="false"
        modal-class="pb-modal-header-compact"
    >
        <template #title>
            <ModalHeaderBar :title="$t('model.add')" @close="visible = false" />
        </template>
        <template #footer>
            <a-button @click="visible = false">{{ $t('common.cancel') }}</a-button>
            <a-button type="primary" @click="doSubmit">{{ $t('common.confirm') }}</a-button>
        </template>
        <div style="max-height: 50vh" class="overflow-y-auto">
            <a-form :model="data" label-align="left" class="mt-4">
                <a-form-item :label="$t('model.id')" name="title" required>
                    <a-input v-model:model-value="data.id" :placeholder="$t('placeholder.requiredGpt')" />
                </a-form-item>
                <a-form-item :label="$t('model.name')" name="title">
                    <a-input v-model:model-value="data.name" :placeholder="$t('placeholder.gpt35')" />
                </a-form-item>
                <a-form-item :label="$t('group.name')" name="type">
                    <a-input v-model:model-value="data.group" :placeholder="$t('placeholder.chatgpt')" />
                </a-form-item>
                <a-form-item :label="$t('model.capVision')" name="capVision">
                    <a-switch v-model="data.caps.vision" />
                </a-form-item>
                <a-form-item :label="$t('model.capTools')" name="capTools">
                    <a-switch v-model="data.caps.tools" />
                </a-form-item>
            </a-form>
        </div>
    </a-modal>
</template>
