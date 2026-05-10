<script setup lang="ts">
import { ref } from "vue";
import { t } from "../../../lang";
import { Dialog } from "../../../lib/dialog";
import { TimeUtil } from "../../../lib/util";
import WebDavManage from "./SystemDataBackup/WebDavManage.vue";

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
    Dialog.loadingOn(t("backup.backingUp"));
    loading.value = true;
    try {
        await window.$mapi.kvdb.dumpToFile(file);
        Dialog.tipSuccess(t("backup.backupSuccess"));
    } catch (e) {
        Dialog.tipError(t("backup.backupFailed"));
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
        filters: [{ name: "Backup", extensions: ["backup"] }],
    });
    if (!file) {
        return;
    }
    Dialog.loadingOn(t("backup.restoring"));
    loading.value = true;
    try {
        await window.$mapi.kvdb.importFromFile(file);
        loading.value = false;
        Dialog.tipSuccess(t("backup.restoreSuccess"));
        await window.$mapi.manager.clearCache();
        await onUpdate();
    } catch (e) {
        Dialog.tipError(t("backup.restoreFailed"));
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
    <a-drawer
        :width="500"
        :visible="visible"
        @close="onClose"
        @ok="onClose"
        @cancel="onClose"
        unmountOnClose
    >
        <template #title> {{ $t("backup.title") }} </template>
        <template #footer>
            <a-button size="small" @click="onClose()">
                {{ $t("common.close") }}
            </a-button>
        </template>
        <div style="margin: -12px -16px">
            <div class="p-3">
                <a-radio-group type="button" v-model:model-value="type">
                    <a-radio value="backup">{{
                        $t("backup.backupToFile")
                    }}</a-radio>
                    <a-radio value="restore">{{
                        $t("backup.restoreFromFile")
                    }}</a-radio>
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
                    <div>{{ $t("backup.backupToLocal") }}</div>
                </div>
                <div class="pt-3">
                    <a-alert> {{ $t("backup.formatTip") }} </a-alert>
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
                    <div>{{ $t("backup.restoreFromLocal") }}</div>
                </div>
                <div class="pt-3">
                    <a-alert> {{ $t("backup.formatTip") }} </a-alert>
                </div>
            </div>
            <div class="p-3" v-if="type === 'webdav'">
                <WebDavManage @update="emit('update')" />
            </div>
        </div>
    </a-drawer>
</template>

<style scoped lang="less"></style>
