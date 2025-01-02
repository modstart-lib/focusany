<script setup lang="ts">
import HotkeyInput from "./components/HotkeyInput.vue";
import {useManagerStore} from "../../store/modules/manager";
import {onMounted, ref} from "vue";
import {useSettingStore} from "../../store/modules/setting";

const setting = useSettingStore()
const manager = useManagerStore()

const isMacOs = focusany.isMacOs()
const isWindows = focusany.isWindows()
const isLinux = focusany.isLinux()
const fastPanelTriggerType = ref('Ctrl')
const autoLaunchEnable = ref(false)

onMounted(() => {
    fastPanelTriggerType.value = manager.configGet('fastPanelTrigger', null).value?.type || 'Ctrl'
    autoLaunchEnable.value = setting.configGet('autoLaunchEnable', false).value
})

const onManagerConfigChange = async (key: string, value: any) => {
    // console.log('onManagerConfigChange', key, value)
    switch (key) {
        case 'fastPanelTriggerType':
            await manager.onConfigChange('fastPanelTrigger', {type: value})
            fastPanelTriggerType.value = value
            break
        case 'autoLaunchEnable':
            await setting.onConfigChange('autoLaunchEnable', value)
            autoLaunchEnable.value = value
            await window.$mapi.app.setAutoLaunch(autoLaunchEnable.value)
            autoLaunchEnable.value = await window.$mapi.app.getAutoLaunch()
            break
    }
}

</script>

<template>
    <div class="p-4">
        <div class="mb-8">
            <div class="text-base font-bold mb-4">功能设置</div>
            <div class="pl-4">
                <div class="flex items-center mb-6">
                    <div class="flex-grow">
                        呼出快捷键
                    </div>
                    <div>
                        <HotkeyInput :value="manager.configGet('mainTrigger',null)"
                                     @change="manager.onConfigChange('mainTrigger',$event)"/>
                    </div>
                </div>
                <div class="flex items-center mb-6">
                    <div class="flex-grow">
                        主题样式
                    </div>
                    <div>
                        <a-radio-group :model-value="setting.configGet('darkMode','auto').value"
                                       @change="setting.onConfigChange('darkMode',$event)">
                            <a-radio value="light">{{ $t('明亮') }}</a-radio>
                            <a-radio value="dark">{{ $t('暗黑') }}</a-radio>
                            <a-radio value="auto">{{ $t('跟随系统') }}</a-radio>
                        </a-radio-group>
                    </div>
                </div>
                <div class="flex items-center mb-6">
                    <div class="flex-grow">
                        快捷面板
                    </div>
                    <div>
                        <a-switch :model-value="setting.configGet('fastPanelEnable',true).value"
                                  @change="setting.onConfigChange('fastPanelEnable',$event)"/>
                    </div>
                </div>
                <div class="flex items-center mb-6"
                     v-if="setting.configGet('fastPanelEnable',true).value">
                    <div class="flex-grow">
                        快捷面板呼出快捷键
                    </div>
                    <div>
                        <a-select :model-value="fastPanelTriggerType"
                                  @change="onManagerConfigChange('fastPanelTriggerType',$event)">
                            <a-option value="Ctrl">Ctrl</a-option>
                            <a-option value="Alt" v-if="isWindows||isLinux">Alt</a-option>
                            <a-option value="Alt" v-if="isMacOs">Option</a-option>
                            <a-option value="Meta" v-if="isMacOs">Meta</a-option>
                        </a-select>
                    </div>
                </div>
                <div class="flex items-center mb-6">
                    <div class="flex-grow">
                        开机启动
                    </div>
                    <div>
                        <a-switch :model-value="autoLaunchEnable"
                                  @change="onManagerConfigChange('autoLaunchEnable',$event)"/>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
