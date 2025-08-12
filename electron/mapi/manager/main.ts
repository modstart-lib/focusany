import {BrowserWindow, ipcMain} from "electron";
import {ActionRecord, ActionTypeEnum, FilePluginRecord, LaunchRecord, PluginEnv,} from "../../../src/types/Manager";
import {ManagerPlugin} from "./plugin";
import {ManagerWindow} from "./window";
import {ManagerPluginEvent} from "./plugin/event";
import {ManagerClipboard} from "./clipboard";
import {ManagerConfig} from "./config/config";
import {AppRuntime} from "../env";
import {ManagerSystem} from "./system";
import {ManagerHotkey} from "./hotkey";
import {ManagerSystemPluginFile} from "./system/plugin/file";
import {Manager} from "./manager";
import {PluginContext, SearchQuery} from "./type";
import {ManagerPluginStore} from "./system/plugin/store/index";
import {Permissions} from "../../lib/permission";
import {Page} from "../../page";
import {ManagerAutomation} from "./automation";
import {ManagerBackend} from "./backend";
import {ManagerEditor} from "./editor";
import ProtocolMain from "../protocol/main";
import {AppsMain} from "../app/main";
import {PluginLog} from "./plugin/log";

const init = () => {
    ManagerClipboard.init().then();
    ManagerEditor.init().then();
};

const ready = () => {
    Permissions.checkAccessibilityAccess().then(enable => {
        if (enable) {
            ManagerHotkey.init();
        } else {
            Page.open("setup").then();
        }
    });
    Permissions.checkScreenCaptureAccess().then(enable => {
        if (enable) {
            ManagerAutomation.init();
        } else {
            Page.open("setup").then();
        }
    });
    ManagerEditor.ready().then();
};

const destroy = () => {
    ManagerClipboard.monitorStop();
    ManagerHotkey.destroy();
};

ipcMain.handle("manager:getConfig", async event => {
    return await ManagerConfig.get();
});

ipcMain.handle("manager:setConfig", async (event, config) => {
    return await ManagerConfig.save(config);
});

ipcMain.handle("manager:isShown", async event => {
    return await ManagerPluginEvent.isMainWindowShown(null, null);
});

ipcMain.handle("manager:show", async event => {
    return await ManagerPluginEvent.showMainWindow(null, null);
});

ipcMain.handle("manager:hide", async event => {
    return await ManagerPluginEvent.hideMainWindow(null, null);
});

ipcMain.handle("manager:getClipboardContent", async event => {
    return await ManagerClipboard.getClipboardContent();
});

ipcMain.handle("manager:getClipboardChangeTime", async event => {
    return ManagerClipboard.lastChangeTimestamp;
});

ipcMain.handle("manager:getSelectedContent", async event => {
    return Manager.selectedContent;
});

ipcMain.handle("manager:listPlugin", async (event, option?: {}) => {
    return await Manager.listPlugin();
});

ipcMain.handle("manager:installPlugin", async (event, fileOrPath: string, option?: {}) => {
    return await ManagerPlugin.installFromFileOrDir(fileOrPath);
});

ipcMain.handle("manager:refreshInstallPlugin", async (event, pluginName: string, option?: {}) => {
    return await ManagerPlugin.refreshInstall(pluginName);
});

ipcMain.handle("manager:uninstallPlugin", async (event, pluginName: string, option?: {}) => {
    // console.log('manager:uninstallPlugin', pluginName)
    return await ManagerPlugin.uninstall(pluginName);
});

ipcMain.handle("manager:getPluginInstalledVersion", async (event, pluginName: string, option?: {}) => {
    return await ManagerPlugin.getPluginInstalledVersion(pluginName);
});

ipcMain.handle("manager:listDisabledActionMatch", async (event, option?: {}) => {
    return await ManagerConfig.listDisabledActionMatch();
});

ipcMain.handle(
    "manager:toggleDisabledActionMatch",
    async (event, pluginName: string, actionName: string, matchName: string, option?: {}) => {
        return await ManagerConfig.toggleDisabledActionMatch(pluginName, actionName, matchName);
    }
);

ipcMain.handle("manager:listPinAction", async (event, option?: {}) => {
    return await ManagerConfig.listPinAction();
});

ipcMain.handle("manager:togglePinAction", async (event, pluginName: string, actionName: string, option?: {}) => {
    return await ManagerConfig.togglePinAction(pluginName, actionName);
});

ipcMain.handle("manager:clearCache", async (event, option?: {}) => {
    await ManagerConfig.clearCache();
    await ManagerSystem.clearCache();
    await ManagerPlugin.clearCache();
});

ipcMain.handle("manager:hotKeyWatch", async (event, option?: {}) => {
    await ManagerHotkey.watch();
});

ipcMain.handle("manager:hotKeyUnwatch", async (event, option?: {}) => {
    await ManagerHotkey.unwatch();
});

ipcMain.handle("manager::listAction", async event => {
    return Manager.listAction();
});

const mergeViewActionRuntime = async (actions: ActionRecord[]) => {
    for (const a of actions) {
        const plugin = await Manager.getPlugin(a.pluginName);
        const {nodeIntegration, preloadBase, mainView} = ManagerPlugin.getInfo(plugin);
        a.runtime.view = {
            nodeIntegration,
            preloadBase,
            mainView,
            showViewDevTools: false,
            heightView: 100,
        };
        // console.log('mergeViewActionRuntime', plugin.development)
        if (plugin.development && plugin.development.env === PluginEnv.DEV && plugin.development.showViewDevTools) {
            a.runtime.view.showViewDevTools = true;
        }
        if (plugin.setting && plugin.setting.heightView) {
            a.runtime.view.heightView = plugin.setting.heightView;
        }
        for (const k of ["preloadBase", "mainView"]) {
            if (
                a.runtime.view[k] &&
                !a.runtime.view[k].startsWith("file://") &&
                !a.runtime.view[k].startsWith("http://")
            ) {
                a.runtime.view[k] = "file://" + a.runtime.view[k];
            }
        }
    }
};

ipcMain.handle("manager:searchFastPanelAction", async (event, query: SearchQuery, option?: {}) => {
    query = Object.assign(
        {
            keywords: "",
            currentFiles: [],
            currentImage: "",
            currentText: "",
            activeWindow: Manager.activeWindow,
        },
        query
    );

    // console.log('manager:searchFastPanelAction', query)

    const request = Manager.createSearchRequest(query);
    const result = {
        id: request.id,
        matchActions: [] as ActionRecord[],
        viewActions: [] as ActionRecord[],
    };

    const actions = await Manager.listAction(request);
    const actionFullNameMap = new Map();
    for (const a of actions) {
        actionFullNameMap.set(a.fullName, a);
    }
    const uniqueRemover = new Set<string>();
    result.matchActions = [
        ...(await Manager.matchActions(uniqueRemover, actions, query)),
        ...(await Manager.searchActions(uniqueRemover, actions, query)),
        ...(await Manager.pinActions(uniqueRemover, actionFullNameMap, query)),
        ...(await Manager.historyActions(uniqueRemover, actionFullNameMap, query)),
    ];
    result.viewActions = result.matchActions.filter(a => a.type === ActionTypeEnum.VIEW && a.data?.showFastPanel);
    result.matchActions = result.matchActions.filter(a => a.type !== ActionTypeEnum.VIEW);

    await mergeViewActionRuntime(result.viewActions);

    return result;
});

ipcMain.handle("manager:searchAction", async (event, query: SearchQuery, option?: {}) => {
    query = Object.assign(
        {
            keywords: "",
            currentFiles: [],
            currentImage: "",
            currentText: "",
            activeWindow: Manager.activeWindow,
        },
        query
    );
    // console.log('manager:searchAction', query)

    const request = Manager.createSearchRequest(query);
    const result = {
        id: request.id,
        detachWindowActions: [],
        searchActions: [],
        matchActions: [],
        viewActions: [],
        historyActions: [],
        pinActions: [],
    };

    // 所有已知的动作
    const actions = await Manager.listAction(request);
    const actionFullNameMap = new Map();
    for (const a of actions) {
        actionFullNameMap.set(a.fullName, a);
    }
    // Files.write('actions.json', JSON.stringify(actions))

    const uniqueRemover = new Set<string>();
    if (!query.keywords) {
        result.detachWindowActions = await Manager.detachWindowActions(uniqueRemover, actionFullNameMap);
    }
    result.searchActions = await Manager.searchActions(uniqueRemover, actions, query);
    result.matchActions = await Manager.matchActions(uniqueRemover, actions, query);
    result.viewActions = [
        ...result.searchActions.filter(a => a.type === ActionTypeEnum.VIEW && a.data?.showMainPanel),
        ...result.matchActions.filter(a => a.type === ActionTypeEnum.VIEW && a.data?.showMainPanel),
    ];
    result.searchActions = result.searchActions.filter(a => a.type !== ActionTypeEnum.VIEW);
    result.matchActions = result.matchActions.filter(a => a.type !== ActionTypeEnum.VIEW);
    if (!query.keywords) {
        result.historyActions = await Manager.historyActions(uniqueRemover, actionFullNameMap, query);
        result.pinActions = await Manager.pinActions(new Set(), actionFullNameMap, query);
    }

    const pinedSet = await ManagerConfig.getPinedActionSet();
    result.searchActions.forEach(a => {
        a.runtime.isPined = pinedSet.has(`${a.pluginName}/${a.name}`);
    });
    result.matchActions.forEach(a => {
        a.runtime.isPined = pinedSet.has(`${a.pluginName}/${a.name}`);
    });
    result.historyActions.forEach(a => {
        a.runtime.isPined = pinedSet.has(`${a.pluginName}/${a.name}`);
    });
    result.pinActions.forEach(a => {
        a.runtime.isPined = true;
    });

    await mergeViewActionRuntime(result.viewActions);

    return result;
});

ipcMain.handle("manager:listDetachWindowActions", async (event, option?: {}) => {
    const actions = await Manager.listAction();
    const actionFullNameMap = new Map();
    for (const a of actions) {
        actionFullNameMap.set(a.fullName, a);
    }
    const uniqueRemover = new Set<string>();
    const result = await Manager.detachWindowActions(uniqueRemover, actionFullNameMap);
    await mergeViewActionRuntime(result);
    return result;
});

ipcMain.handle("manager:subInputChange", async (event, keywords: string, option?: {}) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    await ManagerWindow.subInputChange(senderWindow, keywords);
});

ipcMain.handle("manager:openPlugin", async (event, pluginName: string, option?: {}) => {
    await Manager.openPlugin(pluginName);
});

ipcMain.handle("manager:openAction", async (event, action: ActionRecord) => {
    await Manager.openAction(action);
});

ipcMain.handle("manager:openActionForWindow", async (event, type: "open" | "close", action: ActionRecord) => {
    await Manager.openActionForWindow(type, action);
});

ipcMain.handle("manager:closeMainPlugin", async (event, option?: {}) => {
    await ManagerWindow.close(null);
});

ipcMain.handle("manager:openMainPluginDevTools", async (event, option?: {}) => {
    await ManagerWindow.openMainPluginDevTools();
});

ipcMain.handle("manager:openMainPluginLog", async (event, option?: {}) => {
    const view = ManagerWindow.getViewByWebContents(event.sender);
    await ManagerPluginEvent.logShow(view, {});
});

ipcMain.handle("manager:detachPlugin", async (event, option) => {
    await ManagerWindow.detach();
});

ipcMain.handle("manager:toggleDetachPluginAlwaysOnTop", async (event, alwaysOnTop: boolean, option?: {}) => {
    const view = ManagerWindow.getViewByWebContents(event.sender);
    return ManagerWindow.toggleDetachPluginAlwaysOnTop(view, alwaysOnTop, option);
});

ipcMain.handle("manager:setDetachPluginZoom", async (event, zoom: number, option?: {}) => {
    const view = ManagerWindow.getViewByWebContents(event.sender);
    await ManagerWindow.setDetachPluginZoom(view, zoom, option);
    await ManagerConfig.setPluginConfigItem(view._plugin.name, "zoom", zoom);
});

ipcMain.handle("manager:firePluginMoreMenuClick", async (event, name: string, option?: {}) => {
    const view = ManagerWindow.getViewByWebContents(event.sender);
    await ManagerWindow.firePluginMoreMenuClick(view, name, option);
});

ipcMain.handle("manager:fireDetachOperateClick", async (event, name: string, option?: {}) => {
    const view = ManagerWindow.getViewByWebContents(event.sender);
    await ManagerWindow.fireDetachOperateClick(view, name, option);
});

ipcMain.handle("manager:closeDetachPlugin", async event => {
    const view = ManagerWindow.getViewByWebContents(event.sender);
    await ManagerWindow.closeDetachPlugin(view);
});

ipcMain.handle("manager:openDetachPluginDevTools", async (event, option?: {}) => {
    const view = ManagerWindow.getViewByWebContents(event.sender);
    await ManagerWindow.openDetachPluginDevTools(view);
});

ipcMain.handle("manager:openDetachPluginLog", async (event, option?: {}) => {
    const view = ManagerWindow.getViewByWebContents(event.sender);
    await ManagerPluginEvent.logShow(view, {});
});

ipcMain.handle("manager:setPluginAutoDetach", async (event, autoDetach: boolean, option?: {}) => {
    const view = ManagerWindow.getViewByWebContents(event.sender);
    await ManagerConfig.setPluginConfigItem(view._plugin.name, "autoDetach", autoDetach);
});

ipcMain.handle("manager:getPluginConfig", async (event, pluginName: string, option?: {}) => {
    return await ManagerConfig.getPluginConfig(pluginName);
});

ipcMain.handle("manager:listFilePluginRecords", async (event, option?: {}) => {
    return await ManagerSystemPluginFile.list();
});

ipcMain.handle("manager:updateFilePluginRecords", async (event, records: FilePluginRecord[], option?: {}) => {
    return await ManagerSystemPluginFile.update(records);
});

ipcMain.handle("manager:listLaunchRecords", async (event, option?: {}) => {
    return await ManagerConfig.listLaunch();
});

ipcMain.handle("manager:updateLaunchRecords", async (event, records: LaunchRecord[], option?: {}) => {
    return await ManagerConfig.updateLaunch(records);
});

ipcMain.handle("manager:storeInstall", async (event, pluginName: string, option?: {}) => {
    return await ManagerPluginStore.install(pluginName, option);
});

ProtocolMain.register("open", async params => {
    const pluginName = params.pluginName;
    const pluginVersion = params.pluginVersion;
    const autoInstall = params.autoInstall;
    const plugin = await Manager.getPlugin(pluginName);
    if (!plugin) {
        if (autoInstall) {
            const loading = AppsMain.loading("正在安装插件", {
                percentAuto: true,
            });
            try {
                await ManagerPluginStore.install(pluginName, {
                    version: pluginVersion,
                });
            } catch (e) {
                AppsMain.toast("安装插件失败", {
                    status: "error",
                });
                return;
            } finally {
                loading.close();
            }
            AppsMain.toast("正在打开插件", {
                status: "success",
            });
            await Manager.openPlugin(pluginName);
        } else {
            AppsMain.toast(`插件 ${pluginName} 不存在`, {
                status: "error",
            });
        }
    } else {
        AppsMain.toast("正在打开插件", {
            status: "success",
        });
        await Manager.openPlugin(pluginName);
    }
});

ipcMain.handle("manager:storePublish", async (event, pluginName: string, option?: {}) => {
    return await ManagerPluginStore.publish(pluginName, option);
});

ipcMain.handle("manager:storePublishInfo", async (event, pluginName: string, option?: {}) => {
    return await ManagerPluginStore.publishInfo(pluginName, option);
});

ipcMain.handle("manager:storeInstallingInfo", async (event, pluginName: string, option?: {}) => {
    return await ManagerPluginStore.storeInstallingInfo(pluginName);
});

ipcMain.handle("manager:clipboardList", async (event, option?: {}) => {
    return await ManagerClipboard.list();
});

ipcMain.handle("manager:clipboardClear", async (event, option?: {}) => {
    return await ManagerClipboard.clear();
});

ipcMain.handle("manager:clipboardDelete", async (event, timestamp: number, option?: {}) => {
    return await ManagerClipboard.delete(timestamp);
});

ipcMain.handle("manager:historyClear", async (event, option?: {}) => {
    return await ManagerConfig.clearHistoryAction();
});

ipcMain.handle("manager:historyDelete", async (event, pluginName: string, actionName: string, option?: {}) => {
    return await ManagerConfig.deleteHistoryAction(pluginName, actionName);
});

const getViewByEvent = event => {
    let view = ManagerWindow.getViewByWebContents(event.sender);
    if (!view) {
        try {
            const userAgent = event.sender.getUserAgent();
            const match = userAgent.match(/PluginAction\/([^/]+)\/([^/]+)$/);
            if (match) {
                const pluginName = match[1];
                const actionName = match[2];
                view = {
                    _plugin: Manager.getPluginSync(pluginName),
                } as PluginContext;
            }
        } catch (e) {
        }
    }
    return view;
};

ipcMain.on("FocusAny.Event", async (_event, payload: any) => {
    const view = getViewByEvent(_event);
    const {id, event, data} = payload;
    // console.log('FocusAny.Event', {id, event, data, view})
    const plugin = view._plugin;
    const result = await ManagerBackend.run(plugin, "event", event, data, {
        rejectIfError: true,
    });
    const resultEvent = `FocusAny.Event.${id}`;
    view.webContents.send(resultEvent, result);
});

ipcMain.on(
    "FocusAny.Plugin",
    (
        event,
        payload: {
            type: string;
            data: any;
        }
    ) => {
        const view = getViewByEvent(event);
        const {type, data} = payload;
        ManagerPluginEvent[type](view, data)
            .then(result => {
                event.returnValue = result;
            })
            .catch(e => {
                event.returnValue = e;
                PluginLog.error(view._plugin.name, `ApiError.${type}`, {
                    error: '' + e,
                    data,
                })
            });
    }
);

ipcMain.handle(
    "FocusAny.Plugin.Async",
    async (
        event,
        payload: {
            type: string;
            data: any;
        }
    ) => {
        const view = getViewByEvent(event);
        const {type, data} = payload;
        try {
            return await ManagerPluginEvent[type](view, data);
        } catch (e) {
            PluginLog.error(view._plugin.name, `ApiError.${type}`, {
                error: '' + e,
                data,
            });
            throw e;
        }
    }
);

ipcMain.on("SendTo", (event, winId: number, type: string, ...args: any) => {
    // console.log('SendTo', event.sender.getType(), event.sender.id, {winId, type, payload})
    BrowserWindow.getAllWindows().forEach(w => {
        if (w === AppRuntime.fastPanelWindow) {
            return;
        }
        if (w === AppRuntime.mainWindow) {
            for (let v of w.getBrowserViews()) {
                if (v.webContents.id === winId) {
                    v.webContents.send(type, event.sender.id, ...args);
                }
            }
        } else {
            if (w.webContents.id === winId) {
                w.webContents.send(type, event.sender.id, ...args);
            }
        }
    });
});

export default {
    init,
    ready,
    destroy,
};
