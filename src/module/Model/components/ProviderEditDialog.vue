<script setup lang="ts">
import { ref } from 'vue'
import { ProviderType } from '../types'
import { useModelStore } from '../store/model'
import { t } from '../../../lang'
import ModalHeaderBar from '../../../components/ModalHeaderBar.vue'

const modelStore = useModelStore()
const visible = ref(false)
const data = ref({
    id: '',
    title: '',
    type: 'openai' as ProviderType,
})
const show = (provider) => {
    data.value.id = provider.id
    data.value.title = provider.title
    data.value.type = provider.type
    visible.value = true
}
const doSubmit = () => {
    if (!data.value.title) {
        throw new Error(`[ProviderEditDialog] ${t('provider.submitFailNameEmpty')}`)
    }
    modelStore.edit(data.value)
    visible.value = false
}
const fill = (d: { title?: string; type?: string }) => {
    if (d.title !== undefined) data.value.title = d.title
    if (d.type !== undefined) data.value.type = d.type as ProviderType
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
            <ModalHeaderBar :title="$t('model.editProvider')" @close="visible = false" />
        </template>
        <template #footer>
            <a-button @click="visible = false">{{ $t('common.cancel') }}</a-button>
            <a-button type="primary" @click="doSubmit">{{ $t('common.confirm') }}</a-button>
        </template>
        <div style="max-height: 50vh" class="overflow-y-auto">
            <a-form :model="data" label-align="left" class="mt-4">
                <a-form-item :label="$t('video.providerName')" name="title">
                    <a-input v-model:model-value="data.title" :placeholder="$t('video.providerName')" />
                </a-form-item>
                <a-form-item :label="$t('setting.interfaceType')" name="type">
                    <a-select v-model:model-value="data.type" :placeholder="$t('setting.interfaceType')">
                        <a-option value="openai">OpenAI</a-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </div>
    </a-modal>
</template>
