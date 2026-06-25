<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { testActionSet, testActionUnset } from '../../utils/test'
import ModelSetting from '../../module/Model/ModelSetting.vue'

onMounted(() => {
    testActionSet('systemModel.loaded', () => true)
})

onUnmounted(() => {
    testActionUnset('systemModel.loaded')
})
</script>

<template>
    <div class="overflow-hidden" style="height: calc(100vh - 1px)">
        <ModelSetting />
    </div>
</template>
