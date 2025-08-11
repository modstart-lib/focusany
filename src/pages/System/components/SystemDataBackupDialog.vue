<script setup lang="ts">
import {ref} from "vue";
import {Dialog} from "../../../lib/dialog";
import {TimeUtil} from "../../../lib/util";
import WebDavManage from "./SystemDataBackup/WebDavManage.vue";
import {t} from "../../../lang";

const visible = ref(false);
const loading = ref(false);
const type = ref("backup");

const open = async () => {
    visible.value = true;
};

const onClose = () => {
    visible.value = false;
};

const doBackup = async () => {
    if (loading.value) {
        return;
    }
    const file = await window.$mapi.file.openSave({
        defaultPath: `FocusAny-Backup-${TimeUtil.datetimeString()}.backup`,
    });
    if (!file) {
        return;
    }
    Dialog.loadingOn(t("正在备份..."));
    loading.value = true;
    try {
        await window.$mapi.kvdb.dumpToFile(file);
        Dialog.tipSuccess(t("备份成功"));
    } catch (e) {
        Dialog.tipError(t("备份失败"));
    } finally {
        loading.value = false;
        Dialog.loadingOff();
    }
};

const doRestore = async () => {
    if (loading.value) {
        return;
    }
    const file = await window.$mapi.file.openFile({
        filters: [{name: "Backup", extensions: ["backup"]}],
    });
    if (!file) {
        return;
    }
    Dialog.loadingOn(t("正在恢复..."));
    loading.value = true;
    try {
        await window.$mapi.kvdb.importFromFile(file);
        loading.value = false;
        Dialog.tipSuccess(t("恢复成功"));
        await window.$mapi.manager.clearCache();
        await onUpdate();
    } catch (e) {
        Dialog.tipError(t("恢复失败"));
    } finally {
        loading.value = false;
        Dialog.loadingOff();
    }
};

const onUpdate = async () => {
    emit("update");
};

const emit = defineEmits(["update"]);

defineExpose({
    open,
});
</script>

<template>
    <a-drawer :width="500" :visible="visible" @close="onClose" @ok="onClose" @cancel="onClose" unmountOnClose>
        <template #title> {{$t('备份/恢复')}} </template>
        <template #footer>
            <a-button size="small" @click="onClose()"> {{$t('关闭')}} </a-button>
        </template>
        <div style="margin: -12px -16px">
            <div class="p-3">
                <a-radio-group type="button" v-model:model-value="type">
                    <a-radio value="backup">{{$t('备份为文件')}}</a-radio>
                    <a-radio value="restore">{{$t('从文件恢复')}}</a-radio>
                    <a-radio value="webdav">WebDav</a-radio>
                </a-radio-group>
            </div>
            <div class="p-3" v-if="type === 'backup'">
                <div
                    class="bg-gray-100 dark:bg-gray-700 rounded-lg text-center p-4 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                    @click="doBackup"
                >
                    <div>
                        <icon-download class="text-2xl" />
                    </div>
                    <div>{{$t('备份到本地')}}</div>
                </div>
                <div class="pt-3">
                    <a-alert> {{$t('备份采用 backup 格式，定期备份文件可避免数据丢失。')}} </a-alert>
                </div>
            </div>
            <div class="p-3" v-if="type === 'restore'">
                <div
                    class="bg-gray-100 dark:bg-gray-700 rounded-lg text-center p-4 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                    @click="doRestore"
                >
                    <div>
                        <icon-upload class="text-2xl" />
                    </div>
                    <div>{{$t('从本地恢复')}}</div>
                </div>
                <div class="pt-3">
                    <a-alert> {{$t('备份采用 backup 格式，定期备份文件可避免数据丢失。')}} </a-alert>
                </div>
            </div>
            <div class="p-3" v-if="type === 'webdav'">
                <WebDavManage @update="emit('update')" />
            </div>
        </div>
    </a-drawer>
</template>

<style scoped lang="less"></style>
