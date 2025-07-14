<script setup lang="ts">
import {computed, nextTick, onMounted, ref} from "vue";
import {
    ActionMatchBase, ActionMatchEditor,
    ActionMatchKey,
    ActionMatchRegex,
    ActionMatchText, ActionMatchWindow,
    ActionRecord, PluginActionRecord,
    PluginRecord, PluginType
} from "../../types/Manager";
import {Dialog} from "../../lib/dialog";
import SystemActionMatchDetailDialog from "./components/SystemActionMatchDetailDialog.vue";
import {SystemIcons} from "../../../electron/mapi/manager/system/asset/icon";
import ActionTypeIcon from "./components/ActionTypeIcon.vue";

const actionMatchDetailDialog = ref<InstanceType<typeof SystemActionMatchDetailDialog> | null>(null);
const records = ref<PluginRecord[]>([])
const recordCurrentIndex = ref(-1)
const actionTab = ref('keyword')

const recordCurrent = computed(() => {
    if (recordCurrentIndex.value >= 0 && recordCurrentIndex.value < records.value.length) {
        return records.value[recordCurrentIndex.value]
    }
    return null
})
const currentPluginActionsKeywordList = computed(() => {
    return recordCurrent.value?.actions.filter(a => {
        return a.matches.filter(m => {
            return ['text', 'key'].includes((m as ActionMatchBase).type)
        }).length > 0
    }) || []
})
const currentPluginActionsMatchList = computed(() => {
    return recordCurrent.value?.actions.filter(a => {
        return a.matches.filter(m => {
            return !['text', 'key'].includes((m as ActionMatchBase).type)
        }).length > 0
    }) || []
})
const disabledPluginActionMatches = ref<Record<string, Record<string, string[]>>>({})
const pinPluginAction = ref<PluginActionRecord[]>([])
const doLoad = async () => {
    const plugins = await window.$mapi.manager.listPlugin()
    for (const p of plugins) {
        for (const a of p.actions) {
            for (const m of a.matches) {
                m['_disable'] = ((pName, aName, mName) => {
                    return computed(() => {
                        return disabledPluginActionMatches.value[pName]?.[aName]?.includes(mName)
                    })
                })(p.name, a.name, m.name)
            }
            a['_pin'] = ((pName, aName) => {
                return computed(() => {
                    return !!pinPluginAction.value.find(pa => pa.pluginName === pName && pa.actionName === aName)
                })
            })(p.name, a.name)
        }
    }
    records.value = plugins
    recordCurrentIndex.value = -1
    await nextTick(() => {
        if (records.value.length > 0) {
            recordCurrentIndex.value = 0
        }
    })
}
onMounted(async () => {
    disabledPluginActionMatches.value = await window.$mapi.manager.listDisabledActionMatch()
    pinPluginAction.value = await window.$mapi.manager.listPinAction()
    // console.log('disabledPluginActionMatches', disabledPluginActionMatches.value)
    // console.log('pinPluginAction', pinPluginAction.value)
    await doLoad()
})
const doActivePlugin = (index: number) => {
    actionTab.value = 'keyword'
    recordCurrentIndex.value = index
}
const doDisable = async (action: ActionRecord, matchName: string) => {
    const disabled = await window.$mapi.manager.toggleDisabledActionMatch(recordCurrent.value?.name as string, action.name, matchName)
    disabledPluginActionMatches.value = await window.$mapi.manager.listDisabledActionMatch()
    // console.log('doDisable', action, matchName)
    // console.log('disabledPluginActionMatches', JSON.stringify(disabledPluginActionMatches.value, null, 2))
    if (disabled) {
        Dialog.tipSuccess('已禁用')
    } else {
        Dialog.tipSuccess('已启用')
    }
}
const doOpen = async (action: ActionRecord) => {
    action = JSON.parse(JSON.stringify(action))
    await window.$mapi.manager.openAction(action)
}
const doPin = async (action: ActionRecord) => {
    await window.$mapi.manager.togglePinAction(recordCurrent.value?.name as string, action.name)
    pinPluginAction.value = await window.$mapi.manager.listPinAction()
    // console.log('pinPluginAction', JSON.stringify(pinPluginAction.value, null, 2))
}
</script>

<template>
    <div class="flex h-full">
        <div class="w-56 flex-shrink-0 border-r border-default p-1 h-full overflow-y-auto">
            <div class="p-2 text-gray-400 font-bold">内置</div>
            <template v-for="(p,pIndex) in records">
                <div
                    v-if="['system','store', 'workflow', 'app'].includes(p.name)"
                    class="flex items-center rounded-lg cursor-pointer select-none p-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                    :class="pIndex===recordCurrentIndex?'bg-gray-200 dark:bg-gray-700':''"
                    @click="doActivePlugin(pIndex)">
                    <div class="w-7 rounded-lg mr-2">
                        <img :src="p.logo"
                             :class="p.type===PluginType.SYSTEM?'dark:invert':'plugin-logo-filter'"/>
                    </div>
                    <div class="flex-grow w-0 truncate">
                        {{ p.title }}
                    </div>
                </div>
            </template>
            <div class="p-2 text-gray-400 font-bold">插件</div>
            <template v-for="(p,pIndex) in records">
                <div
                    v-if="!['system','store', 'workflow', 'app', 'file'].includes(p.name)"
                    class="flex items-center rounded-lg cursor-pointer select-none p-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                    :class="pIndex===recordCurrentIndex?'bg-gray-200 dark:bg-gray-700':''"
                    @click="doActivePlugin(pIndex)">
                    <div class="w-8 rounded-lg mr-2">
                        <img :src="p.logo"/>
                    </div>
                    <div class="flex-grow w-0 truncate">
                        {{ p.title }}
                    </div>
                </div>
            </template>
        </div>
        <div class="flex-grow h-full overflow-y-auto p-4">
            <div v-if="recordCurrent">
                <div class="text-center pb-4">
                    <a-radio-group type="button" size="large" v-model="actionTab">
                        <a-radio value="keyword">
                            <div class="flex items-center">
                                <img class="w-6 h-6 mr-1 object-contain dark:invert" :src="SystemIcons.searchKeyword"/>
                                搜索动作
                            </div>
                        </a-radio>
                        <a-radio value="match">
                            <div class="flex items-center">
                                <img class="w-6 h-6 mr-1 object-contain dark:invert" :src="SystemIcons.searchMatch"/>
                                匹配动作
                            </div>
                        </a-radio>
                    </a-radio-group>
                </div>
                <div v-if="actionTab==='keyword'">
                    <m-empty v-if="!currentPluginActionsKeywordList.length"/>
                    <div
                        v-for="a in currentPluginActionsKeywordList"
                        class="py-2">
                        <div class="mb-4 flex items-center">
                            <img class="w-6 h-6 object-contain mr-2"
                                 :class="recordCurrent?.type===PluginType.SYSTEM?'dark:invert':'plugin-logo-filter'"
                                 :src="a.icon"/>
                            <div class="mr-2">{{ a.title }}</div>
                            <ActionTypeIcon class="mr-2" :type="a.type"/>
                            <a-tooltip :content="a['_pin']?'固定到搜索框':'从搜索框取消固定'" position="left">
                                <a href="javascript:;"
                                   class="inline-block w-6 h-6 mr-2 bg-gray-100 dark:bg-gray-600 text-center leading-6 rounded-full"
                                   :class="a['_pin']?'bg-gray-600 dark:bg-gray-200 text-white dark:text-black':''"
                                   @click="doPin(a as any)">
                                    <i class="iconfont icon-pin"></i>
                                </a>
                            </a-tooltip>
                        </div>
                        <div v-for="m in a.matches.filter(m=>['text','key'].includes((m as ActionMatchBase).type))"
                             class="mr-1 mb-1 inline-block">
                            <a-dropdown>
                                <a-button-group>
                                    <a-button v-if="(m as ActionMatchBase).type==='text'"
                                              :type="m['_disable']?undefined:'primary'"
                                              @click.stop="actionMatchDetailDialog?.show(a as any,m as any)"
                                              size="small">
                                        {{ (m as ActionMatchText).text }}
                                    </a-button>
                                    <a-button v-else-if="(m as ActionMatchBase).type==='key'"
                                              :type="m['_disable']?undefined:'primary'"
                                              @click.stop="actionMatchDetailDialog?.show(a as any,m as any)"
                                              size="small">
                                        {{ (m as ActionMatchKey).key }}
                                    </a-button>
                                    <a-button :type="m['_disable']?undefined:'primary'"
                                              size="small">
                                        <template #icon>
                                            <icon-down/>
                                        </template>
                                    </a-button>
                                </a-button-group>
                                <template #content>
                                    <a-doption @click="doOpen(a as any)">
                                        打开
                                    </a-doption>
                                    <a-doption v-if="m['_disable']" @click="doDisable(a as any,m.name as string)">
                                        启用
                                    </a-doption>
                                    <a-doption v-else @click="doDisable(a as any,m.name as string)">
                                        禁用
                                    </a-doption>
                                    <a-doption @click="actionMatchDetailDialog?.show(a as any,m as any)">
                                        详情
                                    </a-doption>
                                </template>
                            </a-dropdown>
                        </div>
                    </div>
                </div>
                <div v-if="actionTab==='match'">
                    <m-empty v-if="!currentPluginActionsMatchList.length"/>
                    <div
                        v-for="a in currentPluginActionsMatchList"
                        class="py-2">
                        <div class="mb-4 flex items-center">
                            <img class="w-6 h-6 object-contain mr-2" :src="a.icon"/>
                            <div class="mr-2">{{ a.title }}</div>
                            <ActionTypeIcon class="mr-2" :type="a.type"/>
                        </div>
                        <div
                            v-for="m in a.matches.filter(m=>['image','file','regex','window','editor'].includes((m as ActionMatchBase).type))"
                            class="mr-1 mb-1 inline-block">
                            <a-dropdown>
                                <a-button-group>
                                    <a-button v-if="(m as ActionMatchBase).type==='regex'"
                                              :type="m['_disable']?undefined:'primary'"
                                              @click.stop="actionMatchDetailDialog?.show(a as any,m as any)"
                                              size="small">
                                        正则
                                        <div class="inline-block max-w-32 overflow-hidden truncate">
                                            {{ (m as ActionMatchRegex).regex }}
                                        </div>
                                    </a-button>
                                    <a-button v-else-if="(m as ActionMatchBase).type==='image'"
                                              :type="m['_disable']?undefined:'primary'"
                                              @click.stop="actionMatchDetailDialog?.show(a as any,m as any)"
                                              size="small">
                                        图片
                                    </a-button>
                                    <a-button v-else-if="(m as ActionMatchBase).type==='file'"
                                              :type="m['_disable']?undefined:'primary'"
                                              @click.stop="actionMatchDetailDialog?.show(a as any,m as any)"
                                              size="small">
                                        文件
                                    </a-button>
                                    <a-button v-else-if="(m as ActionMatchBase).type==='window'"
                                              :type="m['_disable']?undefined:'primary'"
                                              @click.stop="actionMatchDetailDialog?.show(a as any,m as any)"
                                              size="small">
                                        窗口
                                        <div class="inline-block max-w-32 overflow-hidden truncate">
                                            {{ (m as ActionMatchWindow).nameRegex }}
                                            {{ (m as ActionMatchWindow).titleRegex }}
                                            {{ (m as ActionMatchWindow).attrRegex }}
                                        </div>
                                    </a-button>
                                    <a-button v-else-if="(m as ActionMatchBase).type==='editor'"
                                              :type="m['_disable']?undefined:'primary'"
                                              @click.stop="actionMatchDetailDialog?.show(a as any,m as any)"
                                              size="small">
                                        打开文件
                                        <div class="inline-block max-w-32 overflow-hidden truncate">
                                        <span v-if="(m as ActionMatchEditor).fadTypes">
                                            {{ (m as ActionMatchEditor).fadTypes?.join(',') }}
                                        </span>
                                            <span v-if="(m as ActionMatchEditor).extensions">
                                            {{ (m as ActionMatchEditor).extensions.join(',') }}
                                        </span>
                                        </div>
                                    </a-button>
                                    <a-button :type="m['_disable']?undefined:'primary'"
                                              size="small">
                                        <template #icon>
                                            <icon-down/>
                                        </template>
                                    </a-button>
                                </a-button-group>
                                <template #content>
                                    <a-doption v-if="m['_disable']" @click="doDisable(a as any,m.name as string)">
                                        启用
                                    </a-doption>
                                    <a-doption v-else @click="doDisable(a as any,m.name as string)">
                                        禁用
                                    </a-doption>
                                    <a-doption @click="actionMatchDetailDialog?.show(a as any,m as any)">
                                        详情
                                    </a-doption>
                                </template>
                            </a-dropdown>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <SystemActionMatchDetailDialog ref="actionMatchDetailDialog" @disable="doDisable"/>
</template>
