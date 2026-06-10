<script setup lang="ts">
import { onBeforeMount, onMounted, ref } from 'vue'
import { AppConfig } from '../config'

const loading = ref(true)

onMounted(async () => {
    loading.value = false
})

onBeforeMount(() => {})
</script>

<template>
    <div class="page-narrow-container p-8">
        <div class="text-3xl font-bold mb-4">{{ $t('home.welcome') }} {{ AppConfig.name }} ！</div>
        <div></div>
    </div>
</template>
