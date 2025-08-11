<script setup lang="ts">
import {ref} from "vue";
import {SystemDataRecord} from "./type";
import {Dialog} from "../../../lib/dialog";
import SystemDataViewDetailDialog from "./SystemDataViewDetailDialog.vue";

const dataViewDetailDialog = ref<InstanceType<typeof SystemDataViewDetailDialog> | null>();
const visible = ref(false);
const loading = ref(false);
const record = ref<SystemDataRecord | null>(null);
const keys = ref([] as string[]);

const open = async (r: SystemDataRecord) => {
    record.value = r;
    keys.value = [];
    visible.value = true;
    await doLoad();
};

const onClose = () => {
    visible.value = false;
};

const doTruncate = async () => {
    Dialog.confirm(t("确定要清空吗？")).then(async () => {
        Dialog.loadingOn();
        for (const k of keys.value) {
            await window.$mapi.kvdb.remove(record.value?.plugin.name as string, k);
        }
        keys.value = [];
        await doLoad();
        Dialog.loadingOff();
        Dialog.tipSuccess(t("清空成功"));
        visible.value = false;
        emit("update");
    });
};

const doLoad = async () => {
    loading.value = true;
    keys.value = await window.$mapi.kvdb.allKeys(record.value?.plugin.name as string, "");
    loading.value = false;
};

const onUpdate = async () => {
    await doLoad();
    emit("update");
};

const emit = defineEmits(["update"]);

defineExpose({
    open,
});
</script>

<template>
    <a-drawer
        :width="340"
        class="pb-system-data-view-dialog"
        :visible="visible"
        @close="onClose"
        @ok="onClose"
        @cancel="onClose"
        unmountOnClose
    >
        <template #title>
            <div class="flex item-center" style="width: 300px">
                <div class="w-10 bg-gray-100 rounded-lg mr-2">
                    <img :src="record?.plugin.logo" />
                </div>
                <div class="flex-grow">
                    <div class="font-bold text-sm">{{ record?.plugin.title }}</div>
                    <div class="text-gray-400 text-sm">{{ record?.count }} {{$t('份文档')}}</div>
                </div>
            </div>
        </template>
        <template #footer>
            <a-button type="primary" size="small" status="danger" @click="doTruncate()">
                <template #icon>
                    <icon-delete />
                </template>
                {{$t('清空')}}
            </a-button>
            <a-button size="small" @click="onClose()"> {{$t('关闭')}} </a-button>
        </template>
        <div style="margin: -12px -16px; height: calc(100% + 24px)">
            <div class="h-full">
                <m-empty v-if="!loading && keys.length === 0" />
                <div
                    v-for="k in keys"
                    @click="dataViewDetailDialog?.show(record as SystemDataRecord, k)"
                    class="border-b border-solid border-default p-2 truncate w-full hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                    {{ k }}
                </div>
            </div>
        </div>
    </a-drawer>
    <SystemDataViewDetailDialog ref="dataViewDetailDialog" @update="onUpdate" />
</template>

<style lang="less">
.pb-system-data-view-dialog .arco-drawer-header {
    height: auto;
    padding: 1rem;
}
</style>
