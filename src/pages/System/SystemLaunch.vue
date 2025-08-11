<script setup lang="ts">
import {onMounted, ref, toRaw} from "vue";
import {t} from "../../lang";
import {Dialog} from "../../lib/dialog";
import {LaunchRecord} from "../../types/Manager";
import HotkeyInput from "./components/HotkeyInput.vue";

const records = ref<LaunchRecord[]>([]);

onMounted(async () => {
    await doLoad();
});

const doLoad = async () => {
    records.value = await window.$mapi.manager.listLaunchRecords();
};

const doSave = async () => {
    await window.$mapi.manager.updateLaunchRecords(toRaw(records.value));
};

const doAdd = async () => {
    records.value.push({
        hotkey: null as any,
        keyword: "",
    });
    await doSave();
};

const doDelete = async (index: number) => {
    records.value.splice(index, 1);
    await doSave();
};

const doTest = async (index: number) => {
    const record = records.value[index];
    if (!record.keyword) {
        Dialog.tipError(t("请输入动作名称"));
        return;
    }
    focusany.redirect(record.keyword);
};

const doHotkeyChange = async (index: number, hotkey: any) => {
    records.value[index].hotkey = hotkey;
    await doSave();
};
</script>

<template>
    <div class="p-4">
        <div class="flex items-center">
            <div class="flex-grow text-2xl">{{ $t("快捷启动") }}</div>
        </div>
        <div class="pt-4">
            <m-empty v-if="!records.length" />
            <div v-for="(r, rIndex) in records" class="border-t border-solid border-gray-200">
                <div class="flex py-3 items-center">
                    <div>
                        <HotkeyInput :value="r.hotkey" @change="doHotkeyChange(rIndex, $event)" />
                    </div>
                    <div class="ml-3 flex-grow">
                        <a-input v-model="r.keyword" @change="doSave()" :placeholder="$t('动作名称，如 截图')" />
                    </div>
                    <div class="ml-2">
                        <a-button @click="doTest(rIndex)">
                            <template #icon>
                                <icon-play-arrow />
                            </template>
                            {{ $t("测试") }}
                        </a-button>
                    </div>
                    <div class="ml-2">
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
                    {{ $t("增加一个启动动作") }}
                </a-button>
            </div>
        </div>
    </div>
</template>
