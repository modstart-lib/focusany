<script setup lang="ts">
import { ref, computed } from 'vue'
import { t } from '../../../lang'
import { SystemIcons } from '../../../../electron/mapi/manager/system/asset/icon'
import {
    ActionMatch,
    ActionMatchFile,
    ActionMatchKey,
    ActionMatchRegex,
    ActionMatchText,
    ActionMatchTypeEnum,
    ActionRecord,
} from '../../../types/Manager'
import ModalHeaderBar from '../../../components/ModalHeaderBar.vue'

const visible = ref(false)
const action = ref<ActionRecord | null>(null)
const match = ref<ActionMatch | null>(null)

const show = async (a: ActionRecord, m: ActionMatch) => {
    action.value = a
    match.value = m
    visible.value = true
}

const emit = defineEmits(['disable'])

const title = computed(() => {
    if (['text', 'key'].includes(match?.type as string)) {
        return t('action.searchAction')
    }
    return t('action.matchAction')
})

defineExpose({
    show,
})
</script>

<template>
    <a-modal v-model:visible="visible" title-align="start" :closable="false" modal-class="pb-modal-header-compact">
        <template #title>
            <ModalHeaderBar :title="title" @close="visible = false" />
        </template>
        <template #footer>
            <a-button
                type="primary"
                size="small"
                status="danger"
                v-if="!match?.['_disable']"
                @click="emit('disable', action, match?.name)"
            >
                {{ $t('common.disable') }}
            </a-button>
            <a-button type="primary" size="small" v-else @click="emit('disable', action, match?.name)">
                {{ $t('common.enable') }}
            </a-button>
            <a-button size="small" @click="visible = false"> {{ $t('common.close') }} </a-button>
        </template>
        <div class="h-64">
            <div v-if="match?.type === ActionMatchTypeEnum.TEXT">
                <div class="mb-3">
                    <icon-info-circle />
                    {{ $t('action.matchKeywordHint') }}
                </div>
                <div class="text-center text-lg bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-weight">
                    {{ (match as ActionMatchText).text }}
                </div>
            </div>
            <div v-else-if="match?.type === ActionMatchTypeEnum.KEY">
                <div class="mb-3">
                    <icon-info-circle />
                    {{ $t('action.matchExactKeyHint') }}
                </div>
                <div class="text-center text-lg bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-weight">
                    {{ (match as ActionMatchKey).key }}
                </div>
            </div>
            <div v-else-if="match?.type === ActionMatchTypeEnum.REGEX">
                <div class="mb-3">
                    <icon-info-circle />
                    {{ $t('action.matchRegexHint') }}
                </div>
                <div class="text-center text-lg bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-weight">
                    {{ (match as ActionMatchRegex).regex }}
                </div>
            </div>
            <div v-else-if="match?.type === ActionMatchTypeEnum.IMAGE">
                <div class="mb-3">
                    <icon-info-circle />
                    {{ $t('action.matchImageHint') }}
                </div>
            </div>
            <div v-else-if="match?.type === ActionMatchTypeEnum.FILE">
                <div class="mb-3">
                    <icon-info-circle />
                    {{ $t('action.matchFileHint') }}
                </div>
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                    <div v-if="'minCount' in match">
                        {{ $t('action.minCount') }}: {{ (match as ActionMatchFile).minCount }}
                    </div>
                    <div v-if="'maxCount' in match">
                        {{ $t('action.maxCount') }}: {{ (match as ActionMatchFile).maxCount }}
                    </div>
                    <div v-if="'filterExtensions' in match">
                        {{ $t('action.fileExtensions') }}: {{ (match as ActionMatchFile).filterExtensions.join(',') }}
                    </div>
                    <div v-if="'filterFileType' in match">
                        {{ $t('action.fileType') }}:
                        {{
                            (match as ActionMatchFile).filterFileType === 'file'
                                ? $t('common.file')
                                : $t('common.folder')
                        }}
                    </div>
                </div>
            </div>
            <div v-else-if="match?.type === ActionMatchTypeEnum.WINDOW">
                <div class="mb-3">
                    <icon-info-circle />
                    {{ $t('action.matchWindowHint') }}
                </div>
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                    <div v-if="'nameRegex' in match">
                        {{ $t('action.nameMatch') }}：{{ (match as ActionMatchWindow).nameRegex }}
                    </div>
                    <div v-if="'titleRegex' in match">
                        {{ $t('action.titleMatch') }}: {{ (match as ActionMatchWindow).titleRegex }}
                    </div>
                    <div v-if="'attrRegex' in match">
                        {{ $t('action.attrMatch') }}: {{ (match as ActionMatchWindow).attrRegex }}
                    </div>
                </div>
            </div>
            <div v-else-if="match?.type === ActionMatchTypeEnum.EDITOR">
                <div class="mb-3">
                    <icon-info-circle />
                    {{ $t('action.matchEditorHint') }}
                </div>
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                    <div v-if="'extensions' in match">
                        {{ $t('action.suffix') }}：{{ (match as ActionMatchEditor).extensions.join(',') }}
                    </div>
                    <div v-if="'fadTypes' in match">
                        {{ $t('common.type') }}：{{ (match as ActionMatchEditor).fadTypes.join(',') }}
                    </div>
                </div>
            </div>
        </div>
    </a-modal>
</template>
