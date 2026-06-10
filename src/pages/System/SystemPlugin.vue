<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import IconPin from '~icons/mdi/pin'
import { SystemIcons } from '../../../electron/mapi/manager/system/asset/icon'
import MEmpty from '../../components/common/MEmpty.vue'
import { t } from '../../lang'
import { Dialog } from '../../lib/dialog'
import { mapError } from '../../lib/error'
import { testActionSet, testActionUnset } from '../../utils/test'
import {
    ActionMatchBase,
    ActionMatchEditor,
    ActionMatchKey,
    ActionMatchRegex,
    ActionMatchText,
    ActionMatchWindow,
    ActionRecord,
    PluginActionRecord,
    PluginRecord,
    PluginType,
} from '../../types/Manager'
import ActionTypeIcon from './components/ActionTypeIcon.vue'
import SystemActionMatchDetailDialog from './components/SystemActionMatchDetailDialog.vue'

const actionMatchDetailDialog = ref<InstanceType<typeof SystemActionMatchDetailDialog> | null>(null)
const records = ref<PluginRecord[]>([])
const recordCurrentIndex = ref(-1)
const actionTab = ref('keyword')
const filterKeywords = ref('')

const recordsFilter = computed(() => {
    return records.value.filter((r) => {
        if (filterKeywords.value) {
            const kw = filterKeywords.value.toLowerCase()
            if (
                r.title.toLowerCase().includes(kw) ||
                r.name.toLowerCase().includes(kw) ||
                r.description?.toLowerCase().includes(kw)
            ) {
                return true
            }
            return false
        }
        return !['store', 'workflow', 'app', 'file'].includes(r.name)
    })
})
const recordCurrent = computed(() => {
    if (recordCurrentIndex.value >= 0 && recordCurrentIndex.value < recordsFilter.value.length) {
        return recordsFilter.value[recordCurrentIndex.value]
    }
    return null
})
const currentPluginActionsKeywordList = computed(() => {
    return (
        recordCurrent.value?.actions.filter((a) => {
            return (
                a.matches.filter((m) => {
                    return ['text', 'key'].includes((m as ActionMatchBase).type)
                }).length > 0
            )
        }) || []
    )
})
const currentPluginActionsMatchList = computed(() => {
    return (
        recordCurrent.value?.actions.filter((a) => {
            return (
                a.matches.filter((m) => {
                    return !['text', 'key'].includes((m as ActionMatchBase).type)
                }).length > 0
            )
        }) || []
    )
})
const currentPluginMcpList = computed(() => {
    return recordCurrent.value?.mcp?.tools || []
})
const disabledPluginActionMatches = ref<Record<string, Record<string, string[]>>>({})
const pinPluginAction = ref<PluginActionRecord[]>([])
const developerPlugins = ref<string[]>([])

const loadDeveloperInfo = async () => {
    const res = await window.$mapi.user.apiPost('store/member', {})
    developerPlugins.value = res.data.developerPlugins
}

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
                    return !!pinPluginAction.value.find((pa) => pa.pluginName === pName && pa.actionName === aName)
                })
            })(p.name, a.name)
        }
    }
    let currentPluginName = ''
    if (recordCurrentIndex.value >= 0) {
        currentPluginName = recordsFilter.value[recordCurrentIndex.value].name
    }
    records.value = plugins
    recordCurrentIndex.value = -1
    await nextTick(() => {
        if (recordsFilter.value.length > 0) {
            if (currentPluginName) {
                const index = recordsFilter.value.findIndex((r) => r.name === currentPluginName)
                if (index >= 0) {
                    recordCurrentIndex.value = index
                } else {
                    recordCurrentIndex.value = 0
                }
            } else {
                recordCurrentIndex.value = 0
            }
        }
    })
}
onMounted(async () => {
    disabledPluginActionMatches.value = await window.$mapi.manager.listDisabledActionMatch()
    pinPluginAction.value = await window.$mapi.manager.listPinAction()
    loadDeveloperInfo().then()
    await doLoad()
    focusany.setSubInput(
        (keywords) => {
            filterKeywords.value = keywords
        },
        t('plugin.search'),
        true,
        true,
    )
    testActionSet('systemPlugin.loaded', () => records.value.length)
})
onBeforeUnmount(() => {
    focusany.removeSubInput()
    testActionUnset('systemPlugin.loaded')
})

const doActivePlugin = (index: number) => {
    actionTab.value = 'keyword'
    recordCurrentIndex.value = index
}
const doDisable = async (action: ActionRecord, matchName: string) => {
    const disabled = await window.$mapi.manager.toggleDisabledActionMatch(
        recordCurrent.value?.name as string,
        action.name,
        matchName,
    )
    disabledPluginActionMatches.value = await window.$mapi.manager.listDisabledActionMatch()
    // console.log('doDisable', action, matchName)
    // console.log('disabledPluginActionMatches', JSON.stringify(disabledPluginActionMatches.value, null, 2))
    if (disabled) {
        Dialog.tipSuccess(t('plugin.disabled'))
    } else {
        Dialog.tipSuccess(t('plugin.enabled'))
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
const doUninstall = async () => {
    await Dialog.confirm(t('plugin.uninstallConfirm'))
    try {
        await window.$mapi.manager.uninstallPlugin(recordCurrent.value?.name as string)
        Dialog.tipSuccess(t('plugin.uninstallSuccess'))
        doLoad().then()
    } catch (e) {
        Dialog.tipError(t('plugin.uninstallFailed', { error: mapError(e) }))
    }
}
const doRefreshInstall = async () => {
    await window.$mapi.manager.refreshInstallPlugin(recordCurrent.value?.name as string)
    Dialog.tipSuccess(t('plugin.refreshSuccess'))
    doLoad().then()
}
const doPublish = async () => {
    Dialog.loadingOn(t('plugin.publishing'))
    try {
        const res = await window.$mapi.manager.storePublish(recordCurrent.value?.name as string, {
            version: recordCurrent.value?.version as string,
        })
        if (res.code === 0) {
            Dialog.alertError(t('plugin.publishSuccess'))
            doLoad().then()
        } else {
            Dialog.alertError(t('plugin.publishFailed', { error: res.msg }))
        }
    } catch (e) {
        Dialog.tipError(t('plugin.publishFailed', { error: mapError(e) }))
    } finally {
        Dialog.loadingOff()
    }
}
const doPublishInfo = async () => {
    Dialog.loadingOn(t('plugin.updatingInfo'))
    try {
        await window.$mapi.manager.storePublishInfo(recordCurrent.value?.name as string, {
            version: recordCurrent.value?.version as string,
        })
        Dialog.tipSuccess(t('plugin.updateInfoSuccess'))
        doLoad().then()
    } catch (e) {
        Dialog.tipError(t('plugin.updateInfoFailed') + ':' + mapError(e))
    } finally {
        Dialog.loadingOff()
    }
}
const doLog = async () => {
    await window.$mapi.manager.showLog(recordCurrent.value?.name as string)
}
const doInstallPlugin = async (type: 'zip' | 'config') => {
    const filters: any[] = []
    if ('zip' === type) {
        filters.push({ extensions: ['zip'] })
    } else if ('config' === type) {
        filters.push({ name: 'config.json', extensions: ['json'] })
    }
    const file = await window.$mapi.file.openFile({
        filters,
    })
    if (!file) {
        return
    }
    try {
        await window.$mapi.manager.installPlugin(file)
        Dialog.tipSuccess(t('plugin.installSuccess'))
        doLoad().then()
    } catch (e) {
        Dialog.tipError(t('plugin.installFailed') + ':' + mapError(e))
    }
}
const doInstallStore = async () => {
    await window.$mapi.manager.openPlugin('store')
}
</script>

<template>
    <div class="flex h-full select-none">
        <div class="w-64 flex-shrink-0 border-r border-default h-full flex flex-col relative">
            <div class="flex-grow overflow-y-auto p-1">
                <m-empty v-if="!recordsFilter.length" :text="$t('plugin.notFound')" />
                <div
                    v-for="(r, rIndex) in recordsFilter"
                    class="flex items-center rounded-lg cursor-pointer select-none p-2 hover:bg-gray-100 dark:hover:bg-gray-600 relative"
                    @click="doActivePlugin(rIndex)"
                    :class="recordCurrent?.name === r.name ? 'bg-gray-200 dark:bg-gray-700' : ''"
                >
                    <div class="w-7 rounded-lg mr-2">
                        <img
                            :src="r.logo"
                            :class="r.type === PluginType.SYSTEM ? 'dark:invert' : 'plugin-logo-filter'"
                        />
                    </div>
                    <div class="flex-grow w-0 truncate">
                        {{ r.title }}
                    </div>
                    <div v-if="r.type === 'dir'" class="text-xs bg-red-100 text-red-600 rounded px-1">DEV</div>
                    <div v-else-if="r.type === 'zip'" class="text-xs bg-gray-100 text-gray-600 rounded px-1">ZIP</div>
                </div>
            </div>
            <div class="border-t border-solid border-default py-2 text-center">
                <a-dropdown-button type="primary" @click="doInstallStore" class="block">
                    <icon-apps class="mr-1" />
                    {{ $t('plugin.market') }}
                    <template #content>
                        <a-doption @click="doInstallPlugin('zip')">{{ $t('plugin.installLocalZip') }}</a-doption>
                        <a-doption @click="doInstallPlugin('config')">{{ $t('plugin.installLocalConfig') }}</a-doption>
                    </template>
                </a-dropdown-button>
            </div>
        </div>
        <div class="flex-grow h-full overflow-y-auto p-4" v-if="recordCurrent">
            <div class="flex items-center">
                <div class="w-12 rounded-lg mr-2">
                    <img
                        :src="recordCurrent.logo"
                        :class="recordCurrent.type === PluginType.SYSTEM ? 'dark:invert' : 'plugin-logo-filter'"
                    />
                </div>
                <div class="flex-grow w-0 truncate">
                    <div class="leading-6 flex items-center">
                        <div class="font-bold mr-2">{{ recordCurrent.title }}</div>
                        <div class="flex-grow"></div>
                    </div>
                    <div class="flex items-center mb-1">
                        <div class="text-gray-400 text-xs mr-2" v-if="recordCurrent.type !== PluginType.SYSTEM">
                            {{ recordCurrent.name }}
                        </div>
                        <div class="text-gray-400 text-xs mr-2" v-if="recordCurrent.type !== PluginType.SYSTEM">
                            v{{ recordCurrent.version }}
                        </div>
                        <a-tooltip :content="$t('plugin.localPlugin', { path: recordCurrent.runtime?.root })">
                            <div
                                v-if="recordCurrent.type === 'dir'"
                                class="text-xs bg-red-100 text-red-600 rounded px-1 cursor-pointer"
                            >
                                DEV
                            </div>
                        </a-tooltip>
                        <div class="flex-grow"></div>
                    </div>
                    <div class="text-gray-400 text-sm w-full truncate">
                        {{ recordCurrent.description }}
                    </div>
                </div>
                <div class="ml-3 flex items-center">
                    <a-button
                        v-if="recordCurrent.name !== 'system'"
                        type="primary"
                        class="ml-1"
                        status="danger"
                        size="small"
                        @click="doUninstall"
                    >
                        {{ $t('plugin.uninstall') }}
                    </a-button>
                    <a-dropdown v-if="recordCurrent.runtime && recordCurrent.type === PluginType.DIR">
                        <a-button size="small" class="ml-1">
                            <template #icon>
                                <icon-down />
                            </template>
                        </a-button>
                        <template #content>
                            <a-doption @click="doRefreshInstall">{{ $t('common.refresh') }}</a-doption>
                            <a-doption v-if="developerPlugins.includes(recordCurrent.name)" @click="doPublish">
                                {{ $t('plugin.publish') }}
                            </a-doption>
                            <a-doption v-if="developerPlugins.includes(recordCurrent.name)" @click="doPublishInfo">
                                {{ $t('plugin.updateInfo') }}
                            </a-doption>
                            <a-doption v-if="developerPlugins.includes(recordCurrent.name)" @click="doLog">
                                {{ $t('nav.log') }}
                            </a-doption>
                        </template>
                    </a-dropdown>
                </div>
            </div>
            <!--             <pre>{{JSON.stringify(developerPlugins,null,2)}}</pre>-->
            <div class="border-default border-t my-4"></div>
            <div class="text-center pb-4">
                <a-radio-group type="button" size="large" v-model="actionTab">
                    <a-radio value="keyword">
                        <div class="flex items-center">
                            <img class="w-6 h-6 mr-1 object-contain dark:invert" :src="SystemIcons.searchKeyword" />
                            {{ $t('action.searchAction') }}
                        </div>
                    </a-radio>
                    <a-radio value="match">
                        <div class="flex items-center">
                            <img class="w-6 h-6 mr-1 object-contain dark:invert" :src="SystemIcons.searchMatch" />
                            {{ $t('action.matchAction') }}
                        </div>
                    </a-radio>
                    <a-radio value="mcp">
                        <div class="flex items-center">
                            <img class="w-6 h-6 mr-1 object-contain dark:invert" :src="SystemIcons.mcp" />
                            MCP
                        </div>
                    </a-radio>
                </a-radio-group>
            </div>
            <div v-if="actionTab === 'keyword'">
                <m-empty v-if="!currentPluginActionsKeywordList.length" />
                <div v-for="a in currentPluginActionsKeywordList" class="py-2">
                    <div class="mb-4 flex items-center">
                        <img
                            class="w-6 h-6 object-contain mr-2"
                            :class="recordCurrent?.type === PluginType.SYSTEM ? 'dark:invert' : 'plugin-logo-filter'"
                            :src="a.icon"
                        />
                        <div class="mr-2">{{ a.title }}</div>
                        <ActionTypeIcon class="mr-2" :type="a.type" />
                        <a-tooltip
                            :content="a['_pin'] ? $t('action.pinToSearch') : $t('action.unpinFromSearch')"
                            position="left"
                        >
                            <a
                                href="javascript:;"
                                class="inline-block w-6 h-6 mr-2 bg-gray-100 dark:bg-gray-600 text-center leading-6 rounded-full"
                                :class="a['_pin'] ? 'bg-gray-600 dark:bg-gray-200 text-white dark:text-black' : ''"
                                @click="doPin(a as any)"
                            >
                                <IconPin />
                            </a>
                        </a-tooltip>
                    </div>
                    <div
                        v-for="m in a.matches.filter((m) => ['text', 'key'].includes((m as ActionMatchBase).type))"
                        class="mr-1 mb-1 inline-block"
                    >
                        <a-dropdown>
                            <a-button-group>
                                <a-button
                                    v-if="(m as ActionMatchBase).type === 'text'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    {{ (m as ActionMatchText).text }}
                                </a-button>
                                <a-button
                                    v-else-if="(m as ActionMatchBase).type === 'key'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    {{ (m as ActionMatchKey).key }}
                                </a-button>
                                <a-button :type="m['_disable'] ? undefined : 'primary'" size="small">
                                    <template #icon>
                                        <icon-down />
                                    </template>
                                </a-button>
                            </a-button-group>
                            <template #content>
                                <a-doption @click="doOpen(a as any)"> {{ $t('common.open') }}</a-doption>
                                <a-doption v-if="m['_disable']" @click="doDisable(a as any, m.name as string)">
                                    {{ $t('common.enable') }}
                                </a-doption>
                                <a-doption v-else @click="doDisable(a as any, m.name as string)">
                                    {{ $t('common.disable') }}
                                </a-doption>
                                <a-doption @click="actionMatchDetailDialog?.show(a as any, m as any)">
                                    {{ $t('common.detail') }}
                                </a-doption>
                            </template>
                        </a-dropdown>
                    </div>
                </div>
            </div>
            <div v-else-if="actionTab === 'match'">
                <m-empty v-if="!currentPluginActionsMatchList.length" />
                <div v-for="a in currentPluginActionsMatchList" class="py-2">
                    <div class="mb-4 flex items-center">
                        <img
                            class="w-6 h-6 object-contain mr-2"
                            :class="recordCurrent?.type === PluginType.SYSTEM ? 'dark:invert' : 'plugin-logo-filter'"
                            :src="a.icon"
                        />
                        <div class="mr-2">{{ a.title }}</div>
                        <ActionTypeIcon class="mr-2" :type="a.type" />
                    </div>
                    <div
                        v-for="m in a.matches.filter((m) =>
                            ['regex', 'image', 'file', 'window', 'editor'].includes((m as ActionMatchBase).type),
                        )"
                        class="mr-1 mb-1 inline-block"
                    >
                        <a-dropdown>
                            <a-button-group>
                                <a-button
                                    v-if="(m as ActionMatchBase).type === 'regex'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    {{ $t('action.regex') }}
                                    <div class="inline-block max-w-32 overflow-hidden truncate">
                                        {{ (m as ActionMatchRegex).regex }}
                                    </div>
                                </a-button>
                                <a-button
                                    v-else-if="(m as ActionMatchBase).type === 'image'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    {{ $t('common.image') }}
                                </a-button>
                                <a-button
                                    v-else-if="(m as ActionMatchBase).type === 'file'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    {{ $t('common.file') }}
                                </a-button>
                                <a-button
                                    v-else-if="(m as ActionMatchBase).type === 'window'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    {{ $t('action.window') }}
                                    <div class="inline-block max-w-32 overflow-hidden truncate">
                                        {{ (m as ActionMatchWindow).nameRegex }}
                                        {{ (m as ActionMatchWindow).titleRegex }}
                                        {{ (m as ActionMatchWindow).attrRegex }}
                                    </div>
                                </a-button>
                                <a-button
                                    v-else-if="(m as ActionMatchBase).type === 'editor'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    {{ $t('common.openFile') }}
                                    <div class="inline-block max-w-32 overflow-hidden truncate">
                                        <span v-if="(m as ActionMatchEditor).fadTypes">
                                            {{ (m as ActionMatchEditor).fadTypes?.join(',') }}
                                        </span>
                                        <span v-if="(m as ActionMatchEditor).extensions">
                                            {{ (m as ActionMatchEditor).extensions.join(',') }}
                                        </span>
                                    </div>
                                </a-button>
                                <a-button :type="m['_disable'] ? undefined : 'primary'" size="small">
                                    <template #icon>
                                        <icon-down />
                                    </template>
                                </a-button>
                            </a-button-group>
                            <template #content>
                                <a-doption v-if="m['_disable']" @click="doDisable(a as any, m.name as string)">
                                    {{ $t('common.enable') }}
                                </a-doption>
                                <a-doption v-else @click="doDisable(a as any, m.name as string)">
                                    {{ $t('common.disable') }}
                                </a-doption>
                                <a-doption @click="actionMatchDetailDialog?.show(a as any, m as any)">
                                    {{ $t('common.detail') }}
                                </a-doption>
                            </template>
                        </a-dropdown>
                    </div>
                </div>
            </div>
            <div v-else-if="actionTab === 'mcp'">
                <m-empty v-if="currentPluginMcpList.length === 0" />
                <div
                    v-for="tool in currentPluginMcpList"
                    :key="tool.name"
                    class="mb-2 p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                    <div class="font-bold">{{ tool.name }}</div>
                    <div class="text-sm text-gray-600">{{ tool.description }}</div>
                </div>
            </div>
        </div>
    </div>
    <SystemActionMatchDetailDialog ref="actionMatchDetailDialog" @disable="doDisable" />
</template>
