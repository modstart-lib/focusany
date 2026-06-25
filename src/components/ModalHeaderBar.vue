<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineProps<{
    title?: string
}>()

const emit = defineEmits<{
    close: []
}>()

const isOsx = ref(false)

onMounted(() => {
    try {
        isOsx.value = window.$mapi?.app?.isPlatform?.('osx') ?? false
    } catch {
        isOsx.value = false
    }
})
</script>

<template>
    <div class="pb-modal-header-bar" :class="{ osx: isOsx }">
        <!-- macOS traffic light buttons -->
        <div v-if="isOsx" class="mac-dots">
            <span class="dot red" @click="emit('close')"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
        </div>
        <!-- Title -->
        <span class="title-text">{{ title }}</span>
        <!-- Windows/Linux close button -->
        <div v-if="!isOsx" class="win-close" @click="emit('close')">
            <icon-close class="text-xs" />
        </div>
    </div>
</template>

<style scoped>
.pb-modal-header-bar {
    display: flex;
    align-items: center;
    height: 32px;
    position: relative;
    user-select: none;
    -webkit-app-region: no-drag;
}

.pb-modal-header-bar.osx {
    padding-left: 64px;
}

.mac-dots {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    gap: 8px;
    align-items: center;
}

.dot {
    display: block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.dot.red {
    background: #ff5f57;
    border: 1px solid #e2463f;
    cursor: pointer;
}

.dot.red:active {
    filter: brightness(0.75);
}

.dot.yellow {
    background: #ffbd2e;
    border: 1px solid #e1a116;
}

.dot.green {
    background: #28c840;
    border: 1px solid #17a330;
}

.title-text {
    flex: 1;
    font-weight: 600;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text-1);
}

.win-close {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: var(--color-text-1);
}

.win-close:hover {
    background: var(--color-fill-2);
}
</style>

<style>
/* Compact modal header styling: reduce padding for window-like titlebar */
.pb-modal-header-compact .arco-modal-header {
    padding: 4px 16px !important;
}

.pb-modal-header-compact .arco-modal-title {
    display: block;
    width: 100%;
}
</style>
