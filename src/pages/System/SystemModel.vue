<script setup lang="ts">
import {onMounted, ref, toRaw} from "vue";
import {SystemIcons} from "../../../electron/mapi/manager/system/asset/icon";
import DragPasteContainer from "../../components/common/DragPasteContainer.vue";
import {FileUtil} from "../../lib/file";
import {FilePluginRecord} from "../../types/Manager";
import ModelSetting from "../../module/Model/ModelSetting.vue";

const records = ref<FilePluginRecord[]>([]);

onMounted(async () => {
    await doLoad();
});

const doLoad = async () => {
    records.value = await window.$mapi.manager.listFilePluginRecords();
};

const doSave = async () => {
    await window.$mapi.manager.updateFilePluginRecords(toRaw(records.value));
};

const doAdd = async () => {
    const file = await window.$mapi.file.openFile({
        properties: ["openDirectory", "openFile"],
    });
    if (!file) {
        return;
    }
    let icon = SystemIcons.folder;
    if (!(await window.$mapi.file.isDirectory(file))) {
        icon = focusany.getFileIcon(file);
    }
    let title = FileUtil.getBaseName(file);
    records.value.push({
        icon: icon,
        title: title as string,
        path: file,
    });
    await doSave();
};

const doDelete = async (index: number) => {
    records.value.splice(index, 1);
    await doSave();
};

const onDragDropInput = async (files: any[]) => {
    // console.log('onDragDropInput', files)
    for (const f of files) {
        let icon = SystemIcons.folder;
        if (f.isFile) {
            icon = focusany.getFileIcon(f.path);
        }
        records.value.push({
            icon: icon,
            title: FileUtil.getBaseName(f.name),
            path: f.path,
        });
        await doSave();
    }
};
</script>

<template>
    <div class="overflow-hidden"
         style="height:calc(100vh);">
        <ModelSetting/>
    </div>
</template>
