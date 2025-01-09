<script setup lang="ts">
import {computed, onBeforeMount, ref, watch} from "vue";
import {HotkeyKeyItem} from "../../../../electron/mapi/keys/type";

const focus = ref(false);
const platformName = ref<'win' | 'osx' | 'linux' | null>(null);

onBeforeMount(() => {
    platformName.value = window.$mapi?.app?.platformName() as any
})

const props = defineProps({
    value: {
        type: Object,
        default: null
    }
})
const currentValue = ref<HotkeyKeyItem | null>(null)
let newValue = null as HotkeyKeyItem | null

const emit = defineEmits([
    'change'
])

watch(() => props.value, (value) => {
    if (value) {
        if (value.value) {
            currentValue.value = value.value
        } else {
            currentValue.value = value as HotkeyKeyItem
        }
    } else {
        currentValue.value = null
    }
}, {
    immediate: true
})

let lastKeyTime = 0
let lastKey = ''
const showHotkey = computed(() => {
    newValue = null
    if (!currentValue.value) {
        return null
    }
    // console.log('currentValue.value', JSON.stringify(currentValue.value, null, 2))
    const {key, altKey, ctrlKey, metaKey, shiftKey} = currentValue.value as HotkeyKeyItem
    const texts: string[] = []
    if (ctrlKey) {
        if (platformName.value === 'osx') {
            texts.push('Control')
        } else {
            texts.push('Ctrl')
        }
    }
    if (altKey) {
        if (platformName.value === 'osx') {
            texts.push('Option')
        } else {
            texts.push('Alt')
        }
    }
    if (metaKey) {
        if (platformName.value === 'osx') {
            texts.push('Command')
        } else if (platformName.value === 'win') {
            texts.push('Win')
        } else {
            texts.push('Meta')
        }
    }
    if (shiftKey) {
        texts.push('Shift')
    }
    if (key) {
        const valid = [
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
            '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
            'Space',
        ]
        if (valid.includes(key)) {
            texts.push(key)
        }
    }
    if (lastKeyTime > 0 && lastKeyTime < Date.now() - 500) {
        lastKeyTime = 0
    }
    let times = 1
    if (lastKey === texts.join('+') && lastKeyTime > 0) {
        times = 2
    }
    lastKey = texts.join('+')
    lastKeyTime = Date.now()
    if (times > 1) {
        lastKey = ''
    }
    newValue = {
        key: key,
        altKey: altKey,
        ctrlKey: ctrlKey,
        metaKey: metaKey,
        shiftKey: shiftKey,
        times: times
    } as HotkeyKeyItem
    return texts.join('+') + (times > 1 ? `双击` : '')
})

const onHotkey = (data: any) => {
    currentValue.value = {
        key: data.key,
        altKey: data.altKey,
        ctrlKey: data.ctrlKey,
        metaKey: data.metaKey,
        shiftKey: data.shiftKey,
        times: data.times
    }
}

const onFocus = async () => {
    focus.value = true
    await window.$mapi.manager.hotKeyWatch()
    window.__page.onBroadcast('HotkeyWatch', onHotkey)
}
const onBlur = () => {
    focus.value = false
    window.__page.offBroadcast('HotkeyWatch', onHotkey)
    window.$mapi.manager.hotKeyUnwatch()
    if (newValue) {
        // console.log('newValue', JSON.stringify(newValue))
        emit('change', newValue)
    }
}
const content = computed(() => {
    return [
        '使用方式：',
        '① 点击激活',
        platformName.value === 'osx'
            ? '② 先按功能键（Control、Command、Option）再按其他普通键，也可快速按快功能键2次'
            : '② 先按功能键（Ctrl、Shift、Alt）再按其他普通键，也可快速按快功能键2次',
    ].join('')
})
</script>

<template>
    <a-tooltip :content="content">
        <input
            class="border-2 border-solid border-gray-300 dark:border-gray-600 dark:bg-gray-700 h-9 w-48 text-center rounded-lg cursor-pointer flex outline-none select-none"
            @focus="onFocus"
            @blur="onBlur"
            :value="showHotkey?showHotkey:'未设置'"
            readonly
            :class="{'active': focus}"/>
    </a-tooltip>
</template>

<style scoped lang="less">
.active {
    border-color: var(--color-primary) !important;
}
</style>
