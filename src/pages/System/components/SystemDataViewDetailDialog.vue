<script setup lang="ts">
import {ref} from "vue";
import {SystemDataRecord} from "./type";
import CodeViewer from "../../../components/common/CodeViewer.vue";
import {Dialog} from "../../../lib/dialog";

const visible = ref(false);
const record = ref<SystemDataRecord | null>(null);
const recordDetail = ref<any | null>(null);
const key = ref("");

const show = async (r: SystemDataRecord, k: string) => {
    record.value = r;
    key.value = k;
    visible.value = true;
    await doLoad();
};

const doLoad = async () => {
    recordDetail.value = await window.$mapi.kvdb.get(record.value?.plugin.name as string, key.value);
};

const doDelete = async () => {
    Dialog.confirm("确定要删除吗？").then(async () => {
        Dialog.loadingOn();
        await window.$mapi.kvdb.remove(record.value?.plugin.name as string, key.value);
        Dialog.loadingOff();
        Dialog.tipSuccess("删除成功");
        visible.value = false;
        emit("update");
    });
};

const emit = defineEmits(["update"]);

defineExpose({
    show,
});
</script>

<template>
    <a-modal v-model:visible="visible" title-align="start">
        <template #title>
            <div class="truncate hover:bg-gray-100 cursor-pointer w-96">
                {{ key }}
            </div>
        </template>
        <template #footer>
            <a-button type="primary" size="small" status="danger" @click="doDelete"> 删除 </a-button>
            <a-button size="small" @click="visible = false"> 关闭 </a-button>
        </template>
        <div class="h-64" style="margin: -24px -20px">
            <CodeViewer lang="json" :code="JSON.stringify(recordDetail, null, 2)" />
        </div>
    </a-modal>
</template>
