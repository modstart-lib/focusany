<script setup lang="ts">
import { ref } from 'vue'
import { useModelStore } from '../store/model'
import { Model } from '../types'
import ModalHeaderBar from '../../../components/ModalHeaderBar.vue'
import IconEye from '~icons/mdi/eye'
import IconWrench from '~icons/mdi/wrench'

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
const show = (model: Model) => {
    data.value.id = model.id
    data.value.name = model.name
    data.value.group = model.group
    data.value.caps = {
        vision: !!model.caps?.vision,
        tools: !!model.caps?.tools,
    }
    visible.value = true
}
const doSubmit = () => {
    if (!data.value.id) {
        return
    }
    modelStore.modelEdit(props.provider.id, data.value)
    visible.value = false
}
const fill = (d: { id?: string; name?: string; group?: string; caps?: { vision?: boolean; tools?: boolean } }) => {
    if (d.id !== undefined) data.value.id = d.id
    if (d.name !== undefined) data.value.name = d.name
    if (d.group !== undefined) data.value.group = d.group
    if (d.caps !== undefined) {
        data.value.caps = {
            vision: !!d.caps.vision,
            tools: !!d.caps.tools,
        }
    }
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
            <ModalHeaderBar :title="$t('model.edit')" @close="visible = false" />
        </template>
        <template #footer>
            <a-button @click="visible = false">{{ $t('common.cancel') }}</a-button>
            <a-button type="primary" @click="doSubmit">{{ $t('common.confirm') }}</a-button>
        </template>
        <div style="max-height: 50vh" class="overflow-y-auto">
            <a-form :model="data" label-align="left" class="mt-4">
                <a-form-item :label="$t('model.id')" name="title" required>
                    <a-input
                        v-model:model-value="data.id"
                        readonly
                        disabled
                        :placeholder="$t('placeholder.requiredGpt')"
                    />
                </a-form-item>
                <a-form-item :label="$t('model.name')" name="title">
                    <a-input v-model:model-value="data.name" :placeholder="$t('placeholder.gpt35')" />
                </a-form-item>
                <a-form-item :label="$t('group.name')" name="type">
                    <a-input v-model:model-value="data.group" :placeholder="$t('placeholder.chatgpt')" />
                </a-form-item>
                <a-form-item :label="$t('model.capability')" name="caps">
                    <div class="flex gap-4">
                        <a-checkbox v-model="data.caps.vision">
                            <template #checkbox-icon>
                                <IconEye />
                            </template>
                            {{ $t('model.capVision') }}
                        </a-checkbox>
                        <a-checkbox v-model="data.caps.tools">
                            <template #checkbox-icon>
                                <IconWrench />
                            </template>
                            {{ $t('model.capTools') }}
                        </a-checkbox>
                    </div>
                </a-form-item>
            </a-form>
        </div>
    </a-modal>
</template>
