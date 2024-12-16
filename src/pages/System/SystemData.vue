<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from "vue";
import SystemDataViewDialog from "./components/SystemDataViewDialog.vue";
import {SystemDataRecord} from "./components/type";
import SystemDataBackupDialog from "./components/SystemDataBackupDialog.vue";

const dataViewDialog = ref<InstanceType<typeof SystemDataViewDialog> | null>(null);
const dataBackupDialog = ref<InstanceType<typeof SystemDataBackupDialog> | null>(null);

const records = ref([] as SystemDataRecord[])

const doLoad = async () => {
    records.value = []
    const plugins = await window.$mapi.manager.listPlugin()
    for (const plugin of plugins) {
        if (['store', 'workflow', 'app', 'file'].includes(plugin.name)) {
            continue
        }
        const count = await window.$mapi.kvdb.count(plugin.name, '')
        records.value.push({
            plugin, count
        })
    }
    return records.value
}

onMounted(async () => {
    await doLoad()
    window.focusany.setSubInput((keyword) => {
        console.log('keyword', keyword)
    }, '输入关键词过滤', true)
})
onBeforeUnmount(() => {
    window.focusany.removeSubInput()
})

</script>

<template>
    <div class="p-4">
        <div class="flex items-center">
            <div class="flex-grow text-2xl">
                数据中心
            </div>
            <div>
                <a-button size="small" @click="dataBackupDialog?.open()">
                    备份/恢复
                </a-button>
            </div>
        </div>
        <div class="mt-3">
            <div v-for="r in records">
                <div class="flex py-3 border-t border-default">
                    <div class="w-12 bg-gray-100 dark:bg-gray-700 rounded-lg mr-2">
                        <img :src="r.plugin.logo"/>
                    </div>
                    <div class="flex-grow">
                        <div class="font-bold">{{ r.plugin.title }}</div>
                        <div class="text-gray-400">{{ r.count }} 份文档</div>
                    </div>
                    <div>
                        <div class="w-10 h-10 leading-10 text-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                             @click="dataViewDialog?.open(r)"
                        >
                            <icon-storage class="text-lg"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <SystemDataViewDialog ref="dataViewDialog" @update="doLoad"/>
    <SystemDataBackupDialog ref="dataBackupDialog" @update="doLoad"/>
</template>

<style scoped lang="less">

</style>
