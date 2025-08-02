<script setup lang="ts">
import {computed, nextTick, onMounted, ref} from "vue";
import {
    ActionMatchBase,
    ActionMatchEditor,
    ActionMatchKey,
    ActionMatchRegex,
    ActionMatchText,
    ActionMatchWindow,
    ActionRecord,
    ActionTypeEnum,
    PluginActionRecord,
    PluginRecord,
    PluginType,
} from "../../types/Manager";
import {SystemIcons} from "../../../electron/mapi/manager/system/asset/icon";
import {Dialog} from "../../lib/dialog";
import SystemActionMatchDetailDialog from "./components/SystemActionMatchDetailDialog.vue";
import {mapError} from "../../lib/error";
import ActionTypeIcon from "./components/ActionTypeIcon.vue";

const actionMatchDetailDialog = ref<InstanceType<typeof SystemActionMatchDetailDialog> | null>(null);
const records = ref<PluginRecord[]>([]);
const recordCurrentIndex = ref(-1);
const actionTab = ref("keyword");

const recordsFilter = computed(() => {
    return records.value.filter(r => {
        return !["store", "workflow", "app", "file"].includes(r.name);
    });
});
const recordCurrent = computed(() => {
    if (recordCurrentIndex.value >= 0 && recordCurrentIndex.value < recordsFilter.value.length) {
        return recordsFilter.value[recordCurrentIndex.value];
    }
    return null;
});
const currentPluginActionsKeywordList = computed(() => {
    return (
        recordCurrent.value?.actions.filter(a => {
            return (
                a.matches.filter(m => {
                    return ["text", "key"].includes((m as ActionMatchBase).type);
                }).length > 0
            );
        }) || []
    );
});
const currentPluginActionsMatchList = computed(() => {
    return (
        recordCurrent.value?.actions.filter(a => {
            return (
                a.matches.filter(m => {
                    return !["text", "key"].includes((m as ActionMatchBase).type);
                }).length > 0
            );
        }) || []
    );
});
const disabledPluginActionMatches = ref<Record<string, Record<string, string[]>>>({});
const pinPluginAction = ref<PluginActionRecord[]>([]);
const developerPlugins = ref<string[]>([]);

const loadDeveloperInfo = async () => {
    const res = await window.$mapi.user.apiPost("store/member");
    developerPlugins.value = res.data.developerPlugins;
};

const doLoad = async () => {
    const plugins = await window.$mapi.manager.listPlugin();
    for (const p of plugins) {
        for (const a of p.actions) {
            for (const m of a.matches) {
                m["_disable"] = ((pName, aName, mName) => {
                    return computed(() => {
                        return disabledPluginActionMatches.value[pName]?.[aName]?.includes(mName);
                    });
                })(p.name, a.name, m.name);
            }
            a["_pin"] = ((pName, aName) => {
                return computed(() => {
                    return !!pinPluginAction.value.find(pa => pa.pluginName === pName && pa.actionName === aName);
                });
            })(p.name, a.name);
        }
    }
    let currentPluginName = "";
    if (recordCurrentIndex.value >= 0) {
        currentPluginName = recordsFilter.value[recordCurrentIndex.value].name;
    }
    records.value = plugins;
    recordCurrentIndex.value = -1;
    await nextTick(() => {
        if (recordsFilter.value.length > 0) {
            if (currentPluginName) {
                const index = recordsFilter.value.findIndex(r => r.name === currentPluginName);
                if (index >= 0) {
                    recordCurrentIndex.value = index;
                } else {
                    recordCurrentIndex.value = 0;
                }
            } else {
                recordCurrentIndex.value = 0;
            }
        }
    });
};
onMounted(async () => {
    disabledPluginActionMatches.value = await window.$mapi.manager.listDisabledActionMatch();
    pinPluginAction.value = await window.$mapi.manager.listPinAction();
    // console.log('disabledPluginActionMatches', disabledPluginActionMatches.value)
    // console.log('pinPluginAction', pinPluginAction.value)
    loadDeveloperInfo().then();
    await doLoad();
});
const doActivePlugin = (index: number) => {
    actionTab.value = "keyword";
    recordCurrentIndex.value = index;
};
const doDisable = async (action: ActionRecord, matchName: string) => {
    const disabled = await window.$mapi.manager.toggleDisabledActionMatch(
        recordCurrent.value?.name as string,
        action.name,
        matchName
    );
    disabledPluginActionMatches.value = await window.$mapi.manager.listDisabledActionMatch();
    // console.log('doDisable', action, matchName)
    // console.log('disabledPluginActionMatches', JSON.stringify(disabledPluginActionMatches.value, null, 2))
    if (disabled) {
        Dialog.tipSuccess("已禁用");
    } else {
        Dialog.tipSuccess("已启用");
    }
};
const doOpen = async (action: ActionRecord) => {
    action = JSON.parse(JSON.stringify(action));
    await window.$mapi.manager.openAction(action);
};
const doPin = async (action: ActionRecord) => {
    await window.$mapi.manager.togglePinAction(recordCurrent.value?.name as string, action.name);
    pinPluginAction.value = await window.$mapi.manager.listPinAction();
    // console.log('pinPluginAction', JSON.stringify(pinPluginAction.value, null, 2))
};
const doUninstall = async () => {
    await Dialog.confirm("确定要卸载插件吗？");
    try {
        await window.$mapi.manager.uninstallPlugin(recordCurrent.value?.name as string);
        Dialog.tipSuccess("卸载成功");
        doLoad().then();
    } catch (e) {
        Dialog.tipError("卸载失败:" + mapError(e));
    }
};
const doRefreshInstall = async () => {
    await window.$mapi.manager.refreshInstallPlugin(recordCurrent.value?.name as string);
    Dialog.tipSuccess("刷新成功");
    doLoad().then();
};
const doPublish = async () => {
    Dialog.loadingOn("正在发布");
    try {
        const res = await window.$mapi.manager.storePublish(recordCurrent.value?.name as string, {
            version: recordCurrent.value?.version as string,
        });
        if (res.code === 0) {
            Dialog.alertError("发布成功");
            doLoad().then();
        } else {
            Dialog.alertError("发布失败:" + res.msg);
        }
    } catch (e) {
        Dialog.tipError("发布失败:" + mapError(e));
    } finally {
        Dialog.loadingOff();
    }
};
const doPublishInfo = async () => {
    Dialog.loadingOn("正在更新资料");
    try {
        await window.$mapi.manager.storePublishInfo(recordCurrent.value?.name as string, {
            version: recordCurrent.value?.version as string,
        });
        Dialog.tipSuccess("更新资料成功");
        doLoad().then();
    } catch (e) {
        Dialog.tipError("更新资料失败:" + mapError(e));
    } finally {
        Dialog.loadingOff();
    }
};
const doInstallPlugin = async (type: "zip" | "config") => {
    const filters: any[] = [];
    if ("zip" === type) {
        filters.push({extensions: ["zip"]});
    } else if ("config" === type) {
        filters.push({name: "config.json", extensions: ["json"]});
    }
    const file = await window.$mapi.file.openFile({
        properties: ["openFile"],
        filters,
    });
    if (!file) {
        return;
    }
    try {
        await window.$mapi.manager.installPlugin(file);
        Dialog.tipSuccess("安装成功");
        doLoad().then();
    } catch (e) {
        Dialog.tipError("安装失败:" + mapError(e));
    }
};
const doInstallStore = async () => {
    await window.$mapi.manager.openPlugin("store");
};
</script>

<template>
    <div class="flex h-full select-none">
        <div class="w-56 flex-shrink-0 border-r border-default h-full flex flex-col relative">
            <div class="flex-grow overflow-y-auto p-1">
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
                    插件市场
                    <template #content>
                        <a-doption @click="doInstallPlugin('zip')">选择本地ZIP插件</a-doption>
                        <a-doption @click="doInstallPlugin('config')">选择插件config.json</a-doption>
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
                    <div class="text-lg leading-6 flex items-center">
                        <div class="font-bold mr-2">{{ recordCurrent.title }}</div>
                        <div class="text-gray-400" v-if="recordCurrent.type !== PluginType.SYSTEM">
                            v{{ recordCurrent.version }}
                        </div>
                        <a-tooltip :content="'本地插件:' + recordCurrent.runtime?.root">
                            <div
                                v-if="recordCurrent.type === 'dir'"
                                class="text-xs ml-1 bg-red-100 text-red-600 rounded px-1 cursor-pointer"
                            >
                                DEV
                            </div>
                        </a-tooltip>
                        <div class="flex-grow"></div>
                    </div>
                    <div class="text-gray-400 w-0">
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
                        卸载
                    </a-button>
                    <a-dropdown v-if="recordCurrent.runtime && recordCurrent.type === PluginType.DIR">
                        <a-button size="small" class="ml-1">
                            <template #icon>
                                <icon-down />
                            </template>
                        </a-button>
                        <template #content>
                            <a-doption @click="doRefreshInstall">刷新</a-doption>
                            <a-doption v-if="developerPlugins.includes(recordCurrent.name)" @click="doPublish">
                                发布插件
                            </a-doption>
                            <a-doption v-if="developerPlugins.includes(recordCurrent.name)" @click="doPublishInfo">
                                更新信息
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
                            搜索动作
                        </div>
                    </a-radio>
                    <a-radio value="match">
                        <div class="flex items-center">
                            <img class="w-6 h-6 mr-1 object-contain dark:invert" :src="SystemIcons.searchMatch" />
                            匹配动作
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
                        <a-tooltip :content="a['_pin'] ? '固定到搜索框' : '从搜索框取消固定'" position="left">
                            <a
                                href="javascript:;"
                                class="inline-block w-6 h-6 mr-2 bg-gray-100 dark:bg-gray-600 text-center leading-6 rounded-full"
                                :class="a['_pin'] ? 'bg-gray-600 dark:bg-gray-200 text-white dark:text-black' : ''"
                                @click="doPin(a as any)"
                            >
                                <i class="iconfont icon-pin"></i>
                            </a>
                        </a-tooltip>
                    </div>
                    <div
                        v-for="m in a.matches.filter(m=>['text','key'].includes((m as ActionMatchBase).type))"
                        class="mr-1 mb-1 inline-block"
                    >
                        <a-dropdown>
                            <a-button-group>
                                <a-button
                                    v-if="(m as ActionMatchBase).type==='text'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    {{ (m as ActionMatchText).text }}
                                </a-button>
                                <a-button
                                    v-else-if="(m as ActionMatchBase).type==='key'"
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
                                <a-doption @click="doOpen(a as any)"> 打开 </a-doption>
                                <a-doption v-if="m['_disable']" @click="doDisable(a as any, m.name as string)">
                                    启用
                                </a-doption>
                                <a-doption v-else @click="doDisable(a as any, m.name as string)"> 禁用 </a-doption>
                                <a-doption @click="actionMatchDetailDialog?.show(a as any, m as any)"> 详情 </a-doption>
                            </template>
                        </a-dropdown>
                    </div>
                </div>
            </div>
            <div v-if="actionTab === 'match'">
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
                        v-for="m in a.matches.filter(m=>['regex','image','file','window','editor'].includes((m as ActionMatchBase).type))"
                        class="mr-1 mb-1 inline-block"
                    >
                        <a-dropdown>
                            <a-button-group>
                                <a-button
                                    v-if="(m as ActionMatchBase).type==='regex'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    正则
                                    <div class="inline-block max-w-32 overflow-hidden truncate">
                                        {{ (m as ActionMatchRegex).regex }}
                                    </div>
                                </a-button>
                                <a-button
                                    v-else-if="(m as ActionMatchBase).type==='image'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    图片
                                </a-button>
                                <a-button
                                    v-else-if="(m as ActionMatchBase).type==='file'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    文件
                                </a-button>
                                <a-button
                                    v-else-if="(m as ActionMatchBase).type==='window'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    窗口
                                    <div class="inline-block max-w-32 overflow-hidden truncate">
                                        {{ (m as ActionMatchWindow).nameRegex }}
                                        {{ (m as ActionMatchWindow).titleRegex }}
                                        {{ (m as ActionMatchWindow).attrRegex }}
                                    </div>
                                </a-button>
                                <a-button
                                    v-else-if="(m as ActionMatchBase).type==='editor'"
                                    :type="m['_disable'] ? undefined : 'primary'"
                                    @click.stop="actionMatchDetailDialog?.show(a as any, m as any)"
                                    size="small"
                                >
                                    打开文件
                                    <div class="inline-block max-w-32 overflow-hidden truncate">
                                        <span v-if="(m as ActionMatchEditor).fadTypes">
                                            {{ (m as ActionMatchEditor).fadTypes?.join(",") }}
                                        </span>
                                        <span v-if="(m as ActionMatchEditor).extensions">
                                            {{ (m as ActionMatchEditor).extensions.join(",") }}
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
                                    启用
                                </a-doption>
                                <a-doption v-else @click="doDisable(a as any, m.name as string)"> 禁用 </a-doption>
                                <a-doption @click="actionMatchDetailDialog?.show(a as any, m as any)"> 详情 </a-doption>
                            </template>
                        </a-dropdown>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <SystemActionMatchDetailDialog ref="actionMatchDetailDialog" @disable="doDisable" />
</template>
