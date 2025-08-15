<script setup lang="ts">
import {onMounted, ref, toRaw} from "vue";
import {t} from "../../lang";
import {Dialog} from "../../lib/dialog";
import {LaunchRecord} from "../../types/Manager";
import HotkeyInput from "./components/HotkeyInput.vue";
import {SystemIcons} from "../../../electron/mapi/manager/system/asset/icon";
import command from "../../../electron/mapi/manager/system/asset/command.svg";

const records = ref<LaunchRecord[]>([]);

onMounted(async () => {
    await doLoad();
});

const doLoad = async () => {
    records.value = await window.$mapi.manager.listLaunchRecords();
};

const doSave = async () => {
    await window.$mapi.manager.updateLaunchRecords(toRaw(records.value));
    doLoad().then()
};

const doAdd = async () => {
    records.value.push({
        type: "custom",
        pluginName: "",
        name: "",
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
            <div class="flex-grow text-2xl">{{ $t("快捷键") }}</div>
            <div>
                <a-button @click="doAdd">
                    <template #icon>
                        <icon-plus/>
                    </template>
                    {{ $t("增加一个快捷键") }}
                </a-button>
            </div>
        </div>
        <div class="pt-4">
            <m-empty v-if="!records.length"/>
            <div v-for="(r, rIndex) in records" class="border-t border-solid border-gray-200">
                <div class="flex py-3 items-center">
                    <div class="w-8 flex-shrink-0">
                        <a-tooltip v-if="r.type==='plugin'" :content="$t('插件')+ ':'+r.pluginName">
                            <img class="w-6 h-6 object-contain dark:invert" :src="SystemIcons.plugin"/>
                        </a-tooltip>
                        <a-tooltip v-else :content="$t('自定义')">
                            <img class="w-6 h-6 object-contain dark:invert" :src="SystemIcons.command"/>
                        </a-tooltip>
                    </div>
                    <div class="w-42 flex-shrink-0">
                        <HotkeyInput :value="r.hotkey" @change="doHotkeyChange(rIndex, $event)"/>
                    </div>
                    <div class="ml-3 flex-shrink-0 w-28">
                        <a-input v-model="r.name"
                                 :disabled="r.type==='plugin'"
                                 @change="doSave()" :placeholder="$t('说明')"/>
                    </div>
                    <div class="ml-3 flex-grow">
                        <a-input v-model="r.keyword"
                                 :disabled="r.type==='plugin'"
                                 @change="doSave()" :placeholder="$t('动作名称，如 截图')"/>
                    </div>
                    <div class="ml-2">
                        <a-button @click="doTest(rIndex)" class="px-3">
                            <template #icon>
                                <icon-play-arrow/>
                            </template>
                            {{ $t("测试") }}
                        </a-button>
                    </div>
                    <div class="ml-2">
                        <a-button type="primary" status="danger" @click="doDelete(rIndex)">
                            <template #icon>
                                <icon-delete/>
                            </template>
                        </a-button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
