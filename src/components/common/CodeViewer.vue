<script setup lang="ts">
import {PropType, ref, watch} from "vue";
import {EditorView, keymap, lineNumbers} from "@codemirror/view";
import {dracula} from "@uiw/codemirror-theme-dracula";
import {quietlight} from "@uiw/codemirror-theme-quietlight";
import {python} from "@codemirror/lang-python";
import {json} from "@codemirror/lang-json";
import {defaultKeymap} from "@codemirror/commands";
import {EditorState} from "@codemirror/state";
import debounce from "lodash/debounce";

const props = defineProps({
    lang: {
        type: String as PropType<"text" | "python" | "json">,
        default: "python",
    },
    code: {
        type: String,
        default: "",
    },
    dark: {
        type: Boolean,
        default: false,
    },
});
const codeEditorDom = ref<HTMLElement>();
let editor = null as EditorView | null;

const showDebounce = debounce(async () => {
    const extentions = [
        props.dark ? dracula : quietlight,
        keymap.of(defaultKeymap),
        lineNumbers(),
        EditorState.readOnly.of(true),
    ];
    switch (props.lang) {
        case "text":
            break;
        case "python":
            extentions.push(python());
            break;
        case "json":
            extentions.push(json());
            break;
    }
    if (editor) {
        editor.dispatch({
            changes: {from: 0, to: editor.state.doc.length, insert: props.code},
        });
    } else {
        editor = new EditorView({
            state: EditorState.create({
                doc: props.code,
                extensions: extentions,
            }),
            parent: codeEditorDom.value,
        });
    }
}, 100);

watch(() => props.code, showDebounce);
watch(() => props.lang, showDebounce);
</script>

<template>
    <div class="w-full h-96">
        <div ref="codeEditorDom" class=""></div>
    </div>
</template>

<style lang="less">
.cm-editor {
    height: 100%;
    font-size: 0.8rem;
}
</style>
