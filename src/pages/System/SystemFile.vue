<script setup lang="ts">
import {onMounted, ref, toRaw} from "vue";
import {SystemIcons} from "../../../electron/mapi/manager/system/asset/icon";
import DragPasteContainer from "../../components/common/DragPasteContainer.vue";
import {FileUtil} from "../../lib/file";
import {FilePluginRecord} from "../../types/Manager";

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
    if (!(await window.$mapi.file.isDirectory(file,{isDataPath:false}))) {
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
    <DragPasteContainer @input="onDragDropInput">
        <div class="p-4">
            <div class="flex items-center">
                <div class="flex-grow text-2xl">{{ $t("文件启动") }}</div>
                <div></div>
                <div>
                    <a-button v-if="!!records.length" size="small" @click="doAdd">
                        <template #icon>
                            <icon-plus />
                        </template>
                        {{ $t("添加") }}
                    </a-button>
                </div>
            </div>
            <div class="pt-4">
                <m-empty v-if="!records.length" />
                <div v-for="(r, rIndex) in records" class="border-t border-solid border-gray-200">
                    <div class="flex py-3">
                        <div class="w-12 bg-gray-100 rounded-lg mr-2 flex-shrink-0 flex">
                            <img :src="r.icon" class="w-10 h-10 object-contain m-auto" />
                        </div>
                        <div class="flex-grow w-0 pr-10">
                            <div class="font-bold">{{ r.title }}</div>
                            <div class="text-gray-400 truncate">{{ r.path }}</div>
                        </div>
                        <div>
                            <a-button type="primary" status="danger" @click="doDelete(rIndex)">
                                <template #icon>
                                    <icon-delete />
                                </template>
                            </a-button>
                        </div>
                    </div>
                </div>
                <div :class="records.length > 0 ? '' : 'text-center'">
                    <a-button @click="doAdd">
                        <template #icon>
                            <icon-plus />
                        </template>
                        {{ $t("增加一个文件启动") }}
                    </a-button>
                </div>
            </div>
        </div>
    </DragPasteContainer>
</template>
