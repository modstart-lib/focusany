<script setup lang="ts">
import { ref } from 'vue'

const tab = ref('list')

const drawerVisible = ref(false)
const modelVisible = ref(false)
const onClose = () => {
    drawerVisible.value = false
}
const doModelClose = () => {
    modelVisible.value = false
}
</script>

<template>
    <div class="h-dvh flex flex-col border-t border-gray-200">
        <div class="flex items-center p-4 border-b border-solid border-gray-200">
            <div class="flex-grow text-2xl">{{ $t('workflow.workflow') }}</div>
            <div>
                <a-button @click="tab = 'edit'" class="ml-1">
                    <template #icon>
                        <icon-plus />
                    </template>
                    {{ $t('workflow.create') }}
                </a-button>
                <a-button @click="tab = 'list'" class="ml-1">
                    <template #icon>
                        <icon-save />
                    </template>
                    {{ $t('common.save') }}
                </a-button>
            </div>
        </div>
        <div class="flex-grow overflow-y-auto">
            <!--            <WorkflowList v-if="tab==='list'"/>-->
            <!--            <WorkflowEdit v-else-if="tab==='edit'"/>-->
        </div>
    </div>
</template>

<style scoped lang="less"></style>
