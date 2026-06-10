<script setup lang="ts">
import { computed } from 'vue'
import IconCodeBraces from '~icons/mdi/code-braces'
import IconCodeTags from '~icons/mdi/code-tags'
import IconConsole from '~icons/mdi/console'
import IconEyeOutline from '~icons/mdi/eye-outline'
import { t } from '../../../lang'
import { ActionTypeEnum } from '../../../types/Manager'

const props = defineProps<{
    type: ActionTypeEnum | undefined
}>()

const typeTitle = computed(() => {
    switch (props.type) {
        case ActionTypeEnum.WEB:
            return t('action.webpage')
        case ActionTypeEnum.COMMAND:
            return t('action.command')
        case ActionTypeEnum.VIEW:
            return t('action.smartArea')
        case ActionTypeEnum.CODE:
            return t('action.code')
        case ActionTypeEnum.BACKEND:
            return t('action.backendCode')
        default:
            return ''
    }
})

const iconMap: Record<string, any> = {
    [ActionTypeEnum.BACKEND]: IconCodeBraces,
    [ActionTypeEnum.COMMAND]: IconConsole,
    [ActionTypeEnum.VIEW]: IconEyeOutline,
    [ActionTypeEnum.CODE]: IconCodeTags,
}

const currentIcon = computed(() => (props.type ? (iconMap[props.type] ?? null) : null))
</script>

<template>
    <div v-if="type !== ActionTypeEnum.WEB && currentIcon">
        <a-tooltip :content="typeTitle">
            <component :is="currentIcon" />
        </a-tooltip>
    </div>
</template>
