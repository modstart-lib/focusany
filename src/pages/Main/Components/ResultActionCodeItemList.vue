<script setup lang="ts">
import {useManagerStore} from "../../../store/modules/manager";

const manager = useManagerStore();
const props = defineProps<{
    isOsx: boolean,
    doOpenActionCode: (id: string) => void
}>();

</script>

<template>
    <div>
        <div class="pb-main-result-code-item flex items-center p-2 border-t border-gray-300 hover:bg-gray-100"
             v-for="(ci,ciIndex) in manager.actionCodeItems"
             :id="`MainResult_CodeItem_${ci.id}`"
             @click="doOpenActionCode(ci.id)"
             :class="{'bg-gray-200':manager.actionCodeItemActiveId===ci.id}">
            <div class="w-10 h-10 flex items-center justify-center border border-gray-300 mr-3 rounded-lg">
                <div class="w-8 h-8 bg-contain bg-center bg-no-repeat"
                     :style="{backgroundImage:`url(${ci.icon})`}"></div>
            </div>
            <div class="flex-grow">
                <div>{{ ci.title }}</div>
                <div class="text-sm text-gray-500">{{ ci.description }}</div>
            </div>
            <div v-if="ci.shortcutIndex>0">
                <div v-if="isOsx" class="text-xs bg-gray-100 tw-inline-block px-2 py-1 rounded-lg font-mono">
                    <icon-command/>
                    +{{ ci.shortcutIndex }}
                </div>
                <div v-else class="text-xs bg-gray-100 tw-inline-block px-2 py-1 rounded-lg font-mono">
                    CTRL+{{ ci.shortcutIndex }}
                </div>
            </div>
        </div>
    </div>
</template>
