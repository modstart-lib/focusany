<script setup lang="ts">
import { ref, computed } from 'vue'
import CodeViewer from '../../../components/common/CodeViewer.vue'
import { t } from '../../../lang'
import { Dialog } from '../../../lib/dialog'
import { SystemDataRecord } from './type'
import ModalHeaderBar from '../../../components/ModalHeaderBar.vue'

const visible = ref(false)
const record = ref<SystemDataRecord | null>(null)
const recordDetail = ref<any | null>(null)
const key = ref('')

const show = async (r: SystemDataRecord, k: string) => {
    record.value = r
    key.value = k
    visible.value = true
    await doLoad()
}

const doLoad = async () => {
    recordDetail.value = await window.$mapi.kvdb.get(record.value?.plugin.name as string, key.value)
}

const doDelete = async () => {
    Dialog.confirm(t('data.deleteConfirm')).then(async () => {
        Dialog.loadingOn()
        await window.$mapi.kvdb.remove(record.value?.plugin.name as string, key.value)
        Dialog.loadingOff()
        Dialog.tipSuccess(t('data.deleteSuccess'))
        visible.value = false
        emit('update')
    })
}

const emit = defineEmits(['update'])

const title = computed(() => key.value || '')

defineExpose({
    show,
})
</script>

<template>
    <a-modal v-model:visible="visible" title-align="start" :closable="false" modal-class="pb-modal-header-compact">
        <template #title>
            <ModalHeaderBar :title="title" @close="visible = false" />
        </template>
        <template #footer>
            <a-button type="primary" size="small" status="danger" @click="doDelete">
                {{ $t('common.delete') }}
            </a-button>
            <a-button size="small" @click="visible = false"> {{ $t('common.close') }} </a-button>
        </template>
        <div class="h-64" style="margin: -24px -20px">
            <CodeViewer lang="json" :code="JSON.stringify(recordDetail, null, 2)" />
        </div>
    </a-modal>
</template>
