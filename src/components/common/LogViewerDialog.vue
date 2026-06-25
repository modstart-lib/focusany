<script setup lang="ts">
import { ref } from 'vue'
import LogViewer from './LogViewer.vue'
import FileLogViewer from './FileLogViewer.vue'
import ModalHeaderBar from '../ModalHeaderBar.vue'

const visible = ref(false)
const autoScroll = ref(true)

const props = withDefaults(
    defineProps<{
        logFile?: string | null
        logs?: object[] | null
        height?: string
    }>(),
    {
        logFile: null,
        logs: null,
        height: '60vh',
    },
)

const show = () => {
    visible.value = true
}

defineExpose({
    show,
})
</script>

<template>
    <a-modal
        v-model:visible="visible"
        title-align="start"
        :footer="false"
        width="80vw"
        :closable="false"
        modal-class="pb-modal-header-compact"
    >
        <template #title>
            <ModalHeaderBar :title="$t('log.view')" @close="visible = false" />
        </template>
        <div>
            <div class="mb-2 -mt-3">
                <a-checkbox v-model="autoScroll">{{ $t('log.autoScroll') }}</a-checkbox>
            </div>
            <div class="" v-if="visible">
                <div v-if="logs">
                    <LogViewer :logs="logs as any" :height="height" :auto-scroll="autoScroll" />
                </div>
                <div v-else-if="logFile">
                    <FileLogViewer :file="logFile as string" :height="height" :auto-scroll="autoScroll" />
                </div>
            </div>
        </div>
    </a-modal>
</template>
