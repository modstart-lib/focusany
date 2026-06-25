<script setup lang="ts">
defineProps<{ title: string; description?: string; compact?: boolean }>()
</script>

<template>
    <div class="flex items-center gap-3 border-b border-gray-200 bg-white px-5" :class="compact ? 'py-2' : 'py-4'">
        <div class="min-w-0 flex-grow">
            <slot name="title">
                <div class="font-bold text-gray-900" :class="compact ? 'text-base' : 'text-2xl'">{{ title }}</div>
                <div v-if="description" class="mt-1 text-sm text-gray-500">{{ description }}</div>
            </slot>
        </div>
        <div class="flex items-center gap-2">
            <slot />
        </div>
    </div>
</template>
