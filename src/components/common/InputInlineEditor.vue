<script setup lang="ts">
import {nextTick, ref} from "vue";

const props = defineProps<{
    value: string | null | undefined
}>()
const emit = defineEmits({
    change: (value: string) => true
})
const visible = ref(false)
const valueEdit = ref('')
const onVisibleChange = (visible: boolean) => {
    if (visible) {
        valueEdit.value = props.value as string
    }
}
const doEnter = () => {
    nextTick(() => {
        doConfirm()
    })
}
const doConfirm = () => {
    nextTick(() => {
        visible.value = false
    })
    emit('change', valueEdit.value)
}
</script>

<template>
    <div>
        <a-popover v-model:popup-visible="visible"
                   trigger="click" @popup-visible-change="onVisibleChange">
            <slot></slot>
            <template #content>
                <div class="flex">
                    <a-input v-model="valueEdit" @pressEnter="doEnter">
                        <template #append>
                            <div class="cursor-pointer" @click="doConfirm">
                                <icon-check/>
                            </div>
                        </template>
                    </a-input>
                </div>
            </template>
        </a-popover>
    </div>
</template>
