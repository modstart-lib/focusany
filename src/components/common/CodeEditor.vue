<script setup lang="ts">
import { defaultKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { dracula } from '@uiw/codemirror-theme-dracula'
import { quietlight } from '@uiw/codemirror-theme-quietlight'
import { onMounted, onUnmounted, PropType, ref, watch } from 'vue'

const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
    lang: {
        type: String as PropType<'text' | 'python' | 'json' | 'javascript' | 'shell'>,
        default: 'text',
    },
    dark: {
        type: Boolean,
        default: false,
    },
    height: {
        type: String,
        default: '16rem',
    },
})

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const codeEditorDom = ref<HTMLElement>()
let editor: EditorView | null = null

const extensions = () => {
    const list = [
        props.dark ? dracula : quietlight,
        keymap.of(defaultKeymap),
        lineNumbers(),
        EditorView.updateListener.of((update) => {
            if (update.docChanged) emit('update:modelValue', update.state.doc.toString())
        }),
    ]
    if (props.lang === 'python') list.push(python())
    if (props.lang === 'json') list.push(json())
    if (props.lang === 'javascript') list.push(javascript())
    if (props.lang === 'shell') list.push(StreamLanguage.define(shell))
    return list
}

const setEditorContent = (value: string) => {
    if (!editor || editor.state.doc.toString() === value) return
    editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
    })
}

const initEditor = () => {
    if (!codeEditorDom.value || editor) return
    editor = new EditorView({
        state: EditorState.create({
            doc: props.modelValue,
            extensions: extensions(),
        }),
        parent: codeEditorDom.value,
    })
}

watch(() => props.modelValue, setEditorContent)

onMounted(initEditor)
onUnmounted(() => {
    editor?.destroy()
    editor = null
})
</script>

<template>
    <div class="w-full overflow-hidden rounded border border-gray-200" :style="{ height }">
        <div ref="codeEditorDom" class="h-full"></div>
    </div>
</template>

<style lang="less">
.cm-editor {
    height: 100%;
    font-size: 0.8rem;
}
</style>
