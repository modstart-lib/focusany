<script setup lang="ts">

</script>

<template>
    <div class="p-4">
        <div v-for="i in 100">
            <div class="flex py-3">
                <div class="flex-grow">
                    <div class="font-bold">工作流名称</div>
                    <div class="text-gray-400">插件描述</div>
                </div>
                <div class="">
                    <div class="text-sm text-gray-400">
                        已启用
                    </div>
                </div>
            </div>
            <div class="flex items-end">
                <div class="flex-grow">
                    <a-tooltip content="点击打开目录">
                        <div class="inline-block text-gray-400 cursor-pointer">
                            <icon-command class="mr-1"/>
                            Ctrl+G 触发
                            /
                            关键字 bd 触发
                        </div>
                    </a-tooltip>
                </div>
                <div>
                    <a-tooltip content="This is tooltip content">
                        <a-button class="ml-1">
                            <template #icon>
                                <icon-delete/>
                            </template>
                        </a-button>
                    </a-tooltip>
                    <a-tooltip content="启用">
                        <a-button class="ml-1" type="primary" status="danger">
                            <template #icon>
                                <icon-pause/>
                            </template>
                        </a-button>
                    </a-tooltip>
                </div>
            </div>
            <div class="border-b border-solid py-2"></div>
        </div>
    </div>
</template>

<style scoped lang="less">

</style>
