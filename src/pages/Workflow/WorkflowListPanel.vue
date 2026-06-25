<script setup lang="ts">
defineProps<{
    workflows: any[]
    runningWorkflowIds: string[]
}>()

const emit = defineEmits<{
    create: []
    edit: [workflow: any]
    run: [workflow: any]
    delete: [workflow: any]
    copy: [workflow: any]
    history: [workflow: any]
}>()
</script>

<template>
    <div class="min-h-0 flex-grow overflow-y-auto p-5">
        <div v-if="workflows.length" class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div
                v-for="workflow in workflows"
                :key="workflow.id"
                class="relative rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                data-testid="workflow-list-card"
            >
                <div
                    v-if="runningWorkflowIds.includes(workflow.id)"
                    class="absolute right-4 top-4 rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600"
                    data-testid="workflow-running-badge"
                >
                    {{ $t('workflow.running') }}
                </div>
                <div class="mb-6 flex items-start gap-4">
                    <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <icon-share-alt />
                    </div>
                    <div class="min-w-0 flex-grow pr-20">
                        <div class="truncate text-lg font-bold text-gray-950">{{ workflow.name }}</div>
                        <div class="mt-2 text-sm text-gray-400">
                            {{ $t('workflow.nodeCount', { count: workflow.data?.nodes?.length || 0 }) }} ·
                            {{ $t('workflow.edgeCount', { count: workflow.data?.edges?.length || 0 }) }}
                        </div>
                    </div>
                </div>

                <div class="flex items-center justify-between">
                    <a-button
                        type="primary"
                        :loading="runningWorkflowIds.includes(workflow.id)"
                        @click="emit('run', workflow)"
                    >
                        <template #icon><icon-play-arrow /></template>
                        {{ $t('workflow.run') }}
                    </a-button>
                    <div class="flex items-center gap-2">
                        <a-button @click="emit('history', workflow)">
                            <template #icon><icon-history /></template>
                            {{ $t('workflow.runHistory') }}
                        </a-button>
                        <a-dropdown>
                            <a-button>
                                <template #icon><icon-more /></template>
                            </a-button>
                            <template #content>
                                <a-doption @click="emit('edit', workflow)">
                                    <template #icon><icon-edit /></template>
                                    {{ $t('common.edit') }}
                                </a-doption>
                                <a-doption @click="emit('copy', workflow)">
                                    <template #icon><icon-copy /></template>
                                    {{ $t('common.copy') }}
                                </a-doption>
                                <a-doption @click="emit('delete', workflow)">
                                    <template #icon><icon-delete /></template>
                                    {{ $t('common.delete') }}
                                </a-doption>
                            </template>
                        </a-dropdown>
                    </div>
                </div>
            </div>
        </div>

        <div
            v-else
            class="flex h-[60vh] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white"
        >
            <div class="text-center">
                <div class="text-lg font-bold text-gray-800">{{ $t('workflow.emptyTitle') }}</div>
                <div class="mt-2 text-sm text-gray-500">{{ $t('workflow.emptyDesc') }}</div>
                <a-button class="mt-4" type="primary" @click="emit('create')">{{ $t('workflow.createNow') }}</a-button>
            </div>
        </div>
    </div>
</template>
