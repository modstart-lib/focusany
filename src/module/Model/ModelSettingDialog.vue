<script setup lang="ts">
import { ref } from 'vue'
import ModelSetting from './ModelSetting.vue'
import ModalHeaderBar from '../../components/ModalHeaderBar.vue'

const visible = ref(false)
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
        width="50rem"
        :footer="false"
        :esc-to-close="false"
        :mask-closable="false"
        title-align="start"
        :closable="false"
        modal-class="pb-modal-header-compact"
    >
        <template #title>
            <ModalHeaderBar :title="$t('setting.llm')" @close="visible = false" />
        </template>
        <div class="-mx-5 -my-6" style="height: calc(100vh - 15rem)">
            <ModelSetting />
        </div>
    </a-modal>
</template>
