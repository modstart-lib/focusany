<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useManagerStore } from "../../store/modules/manager";
import { useSettingStore } from "../../store/modules/setting";
import { changeLocale, i18n, listLocales } from "../../lang";
import HotkeyInput from "./components/HotkeyInput.vue";

const setting = useSettingStore();
const manager = useManagerStore();

const isMacOs = focusany.isMacOs();
const isWindows = focusany.isWindows();
const isLinux = focusany.isLinux();
const fastPanelTriggerType = ref("Ctrl");
const autoLaunchEnable = ref(false);

onMounted(() => {
    fastPanelTriggerType.value =
        manager.configGet("fastPanelTrigger", null).value?.type || "Ctrl";
    autoLaunchEnable.value = setting.configGet("autoLaunchEnable", false).value;
});

const onManagerConfigChange = async (key: string, value: any) => {
    // console.log('onManagerConfigChange', key, value)
    switch (key) {
        case "fastPanelTriggerType":
            let valueArr = value.split(":");
            let valueObj = {
                type: valueArr[0],
                times: valueArr.length > 1 ? parseInt(valueArr[1]) : 1,
            };
            await manager.onConfigChange("fastPanelTrigger", valueObj);
            fastPanelTriggerType.value = value;
            break;
        case "autoLaunchEnable":
            await setting.onConfigChange("autoLaunchEnable", value);
            autoLaunchEnable.value = value;
            await window.$mapi.app.setAutoLaunch(autoLaunchEnable.value);
            autoLaunchEnable.value = await window.$mapi.app.getAutoLaunch();
            break;
    }
};
</script>

<template>
    <div class="p-4">
        <div class="mb-8">
            <div class="text-base font-bold mb-4">
                {{ $t("setting.functionSettings") }}
            </div>
            <div class="pl-4">
                <div class="flex items-center mb-6">
                    <div class="flex-grow">{{ $t("setting.language") }}</div>
                    <div>
                        <a-select
                            :model-value="i18n.global.locale.value"
                            @change="changeLocale($event as string)"
                        >
                            <a-option
                                v-for="item in listLocales()"
                                :key="item.name"
                                :value="item.name"
                                >{{ item.label }}</a-option
                            >
                        </a-select>
                    </div>
                </div>
                <div class="flex items-center mb-6">
                    <div class="flex-grow">
                        {{ $t("setting.invokeHotkey") }}
                    </div>
                    <div>
                        <HotkeyInput
                            :value="manager.configGet('mainTrigger', null)"
                            @change="
                                manager.onConfigChange('mainTrigger', $event)
                            "
                        />
                    </div>
                </div>
                <div class="flex items-center mb-6">
                    <div class="flex-grow">{{ $t("setting.themeStyle") }}</div>
                    <div>
                        <a-radio-group
                            :model-value="
                                setting.configGet('darkMode', 'auto').value
                            "
                            @change="setting.onConfigChange('darkMode', $event)"
                        >
                            <a-radio value="light">{{
                                $t("setting.lightTheme")
                            }}</a-radio>
                            <a-radio value="dark">{{
                                $t("setting.darkTheme")
                            }}</a-radio>
                            <a-radio value="auto">{{
                                $t("setting.followSystem")
                            }}</a-radio>
                        </a-radio-group>
                    </div>
                </div>
                <div class="flex items-center mb-6">
                    <div class="flex-grow">{{ $t("setting.fastPanel") }}</div>
                    <div>
                        <a-switch
                            :model-value="
                                setting.configGet('fastPanelEnable', true).value
                            "
                            @change="
                                setting.onConfigChange(
                                    'fastPanelEnable',
                                    $event,
                                )
                            "
                        />
                    </div>
                </div>
                <div
                    class="flex items-center mb-6"
                    v-if="setting.configGet('fastPanelEnable', true).value"
                >
                    <div class="flex-grow">
                        {{ $t("setting.fastPanelHotkey") }}
                    </div>
                    <div>
                        <a-select
                            :model-value="fastPanelTriggerType"
                            @change="
                                onManagerConfigChange(
                                    'fastPanelTriggerType',
                                    $event,
                                )
                            "
                        >
                            <a-option
                                value="Ctrl"
                                v-if="isWindows || isLinux"
                                >{{ $t("setting.ctrlSingleClick") }}</a-option
                            >
                            <a-option value="Ctrl" v-else-if="isMacOs">{{
                                $t("setting.controlSingleClick")
                            }}</a-option>
                            <a-option
                                value="Ctrl:2"
                                v-if="isWindows || isLinux"
                                >{{ $t("setting.ctrlDoubleClick") }}</a-option
                            >
                            <a-option value="Ctrl:2" v-else-if="isMacOs">{{
                                $t("setting.controlDoubleClick")
                            }}</a-option>
                            <a-option value="Alt" v-if="isWindows || isLinux">{{
                                $t("setting.altSingleClick")
                            }}</a-option>
                            <a-option value="Alt" v-else-if="isMacOs">{{
                                $t("setting.optionSingleClick")
                            }}</a-option>
                            <a-option
                                value="Alt:2"
                                v-if="isWindows || isLinux"
                                >{{ $t("setting.altDoubleClick") }}</a-option
                            >
                            <a-option value="Alt:2" v-else-if="isMacOs">{{
                                $t("setting.optionDoubleClick")
                            }}</a-option>
                            <a-option value="Meta" v-if="isMacOs">{{
                                $t("setting.commandSingleClick")
                            }}</a-option>
                            <a-option value="Meta:2" v-if="isMacOs">{{
                                $t("setting.commandDoubleClick")
                            }}</a-option>
                        </a-select>
                    </div>
                </div>
                <div class="flex items-center mb-6">
                    <div class="flex-grow">{{ $t("setting.autoLaunch") }}</div>
                    <div>
                        <a-switch
                            :model-value="autoLaunchEnable"
                            @change="
                                onManagerConfigChange(
                                    'autoLaunchEnable',
                                    $event,
                                )
                            "
                        />
                    </div>
                </div>
                <div class="flex items-center mb-6">
                    <div class="flex-grow">
                        {{ $t("setting.detachWindowHotkey") }}
                    </div>
                    <div>
                        <HotkeyInput
                            :value="
                                manager.configGet('detachWindowTrigger', null)
                            "
                            @change="
                                manager.onConfigChange(
                                    'detachWindowTrigger',
                                    $event,
                                )
                            "
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
