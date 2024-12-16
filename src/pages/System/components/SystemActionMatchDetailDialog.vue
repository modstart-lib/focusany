<script setup lang="ts">
import {ref} from "vue";
import {
    ActionMatch, ActionMatchFile, ActionMatchImage,
    ActionMatchKey,
    ActionMatchRegex,
    ActionMatchText,
    ActionMatchTypeEnum,
    ActionRecord
} from "../../../types/Manager";
import {SystemIcons} from "../../../../electron/mapi/manager/system/asset/icon";

const visible = ref(false)
const action = ref<ActionRecord | null>(null)
const match = ref<ActionMatch | null>(null)

const show = async (a: ActionRecord, m: ActionMatch) => {
    action.value = a
    match.value = m
    visible.value = true
}

const emit = defineEmits([
    'disable'
])

defineExpose({
    show
})

</script>

<template>
    <a-modal v-model:visible="visible"
             title-align="start">
        <template #title>
            <div v-if="['text','key'].includes(match?.type as string)" class="flex items-center">
                <img class="w-6 h-6 object-contain mr-2" :src="SystemIcons.searchKeyword"/>
                功能指令
            </div>
            <div v-else class="flex items-center">
                <img class="w-6 h-6 object-contain mr-2" :src="SystemIcons.searchMatch"/>
                匹配指令
            </div>
        </template>
        <template #footer>
            <a-button type="primary" size="small" status="danger"
                      v-if="!match?.['_disable']"
                      @click="emit('disable',action,match?.name)">
                禁用
            </a-button>
            <a-button type="primary" size="small"
                      v-else
                      @click="emit('disable',action,match?.name)">
                启用
            </a-button>
            <a-button size="small" @click="visible=false">
                关闭
            </a-button>
        </template>
        <div class="h-64">
            <div v-if="match?.type===ActionMatchTypeEnum.TEXT">
                <div class="mb-3">
                    <icon-info-circle/>
                    输入匹配以下关键词则显示此指令，包含全拼、首字母简写
                </div>
                <div class="text-center text-lg bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-weight">
                    {{ (match as ActionMatchText).text }}
                </div>
            </div>
            <div v-else-if="match?.type===ActionMatchTypeEnum.KEY">
                <div class="mb-3">
                    <icon-info-circle/>
                    输入完全等于以下关键词则显示此指令
                </div>
                <div class="text-center text-lg bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-weight">
                    {{ (match as ActionMatchKey).key }}
                </div>
            </div>
            <div v-else-if="match?.type===ActionMatchTypeEnum.REGEX">
                <div class="mb-3">
                    <icon-info-circle/>
                    输入匹配以下正则表达式则显示此指令
                </div>
                <div class="text-center text-lg bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-weight">
                    {{ (match as ActionMatchRegex).regex }}
                </div>
            </div>
            <div v-else-if="match?.type===ActionMatchTypeEnum.IMAGE">
                <div class="mb-3">
                    <icon-info-circle/>
                    当匹配到图片时显示此指令
                </div>
            </div>
            <div v-else-if="match?.type===ActionMatchTypeEnum.FILE">
                <div class="mb-3">
                    <icon-info-circle/>
                    当使用以下规则匹配到文件时显示此指令
                </div>
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                    <div v-if="'minCount' in match">
                        最小数量: {{ (match as ActionMatchFile).minCount }}
                    </div>
                    <div v-if="'maxCount' in match">
                        最大数量: {{ (match as ActionMatchFile).maxCount }}
                    </div>
                    <div v-if="'filterExtensions' in match">
                        文件后缀: {{ (match as ActionMatchFile).filterExtensions.join(',') }}
                    </div>
                    <div v-if="'filterFileType' in match">
                        文件类型: {{ (match as ActionMatchFile).filterFileType==='file'? '文件':'文件夹' }}
                    </div>
                </div>
            </div>
        </div>
    </a-modal>
</template>
