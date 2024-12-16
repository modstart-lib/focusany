<script setup lang="ts">
import HotkeyInput from "./components/HotkeyInput.vue";
import {useManagerStore} from "../../store/modules/manager";
import {onMounted} from "vue";
import {useSettingStore} from "../../store/modules/setting";

const setting = useSettingStore()
const manager = useManagerStore()
onMounted(() => {

})
</script>

<template>
    <div class="p-4">
        <div class="mb-8">
            <div class="text-base font-bold mb-4">功能设置</div>
            <div class="pl-4">
                <div class="flex mb-4">
                    <div class="flex-grow">
                        呼出快捷键
                    </div>
                    <div>
                        <HotkeyInput :value="manager.configGet('mainTrigger',null)"
                                     @change="manager.onConfigChange('mainTrigger',$event)"/>
                    </div>
                </div>
                <div class="flex mb-4">
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
                <div v-if="0" class="flex mb-4">
                    <div class="flex-grow">
                        快捷面板
                    </div>
                    <div>
                        <HotkeyInput/>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
