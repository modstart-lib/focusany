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
        <div class="flex items-center p-2 border-t border-gray-300 hover:bg-gray-100"
             v-for="(ci,ciIndex) in manager.actionCodeItems"
             :id="`MainResult_CodeItem_${ci.id}`"
             @click="doOpenActionCode(ci.id)"
             :class="{'bg-gray-200':manager.actionCodeItemActiveId===ci.id}">
            <div class="w-10 h-10 bg-contain bg-center border-gray-300 mr-3 rounded-lg bg-no-repeat"
                 :class="{'border':!!ci.iconBorder}"
                 :style="{backgroundImage:`url(${ci.icon})`}"></div>
            <div class="flex-grow">
                <div>{{ ci.title }}</div>
                <div class="text-sm text-gray-500">{{ ci.description }}</div>
            </div>
            <div v-if="ciIndex<9">
                <div v-if="isOsx" class="text-xs bg-gray-100 tw-inline-block px-2 py-1 rounded-lg font-mono">
                    <icon-command/>
                    +{{ ciIndex + 1 }}
                </div>
                <div v-else class="text-xs bg-gray-100 tw-inline-block px-2 py-1 rounded-lg font-mono">
                    CTRL+{{ ciIndex + 1 }}
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">

</style>
