import {ipcRenderer} from "electron";
import {ActionRecord, ConfigRecord, PluginRecord} from "../../../src/types/Manager";

const getConfig = async () => {
    return ipcRenderer.invoke("manager:getConfig");
};

const setConfig = async (config: ConfigRecord) => {
    return ipcRenderer.invoke("manager:setConfig", config);
};

const isShown = async () => {
    return ipcRenderer.invoke("manager:isShown");
};

const show = async () => {
    return ipcRenderer.invoke("manager:show");
};

const hide = async () => {
    return ipcRenderer.invoke("manager:hide");
};

const getClipboardContent = () => {
    return ipcRenderer.invoke("manager:getClipboardContent");
};

const getClipboardChangeTime = () => {
    return ipcRenderer.invoke("manager:getClipboardChangeTime");
};

const getSelectedContent = async () => {
    return ipcRenderer.invoke("manager:getSelectedContent");
};

const listPlugin = async (option?: {}) => {
    return ipcRenderer.invoke("manager:listPlugin", option);
};

const installPlugin = async (fileOrPath: string, option?: {}) => {
    return ipcRenderer.invoke("manager:installPlugin", fileOrPath, option);
};

const refreshInstallPlugin = async (pluginName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:refreshInstallPlugin", pluginName, option);
};

const uninstallPlugin = async (pluginName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:uninstallPlugin", pluginName, option);
};

const getPluginInstalledVersion = async (pluginName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:getPluginInstalledVersion", pluginName, option);
};

const listDisabledActionMatch = async (option?: {}) => {
    return ipcRenderer.invoke("manager:listDisabledActionMatch", option);
};

const toggleDisabledActionMatch = async (pluginName: string, actionName: string, matchName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:toggleDisabledActionMatch", pluginName, actionName, matchName, option);
};

const listPinAction = async (option?: {}) => {
    return ipcRenderer.invoke("manager:listPinAction", option);
};

const togglePinAction = async (pluginName: string, actionName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:togglePinAction", pluginName, actionName, option);
};

const showLog = async (pluginName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:showLog", pluginName, option);
}

const clearCache = async (option?: {}) => {
    return ipcRenderer.invoke("manager:clearCache", option);
};

const hotKeyWatch = async (option?: {}) => {
    return ipcRenderer.invoke("manager:hotKeyWatch", option);
};

const hotKeyUnwatch = async (option?: {}) => {
    return ipcRenderer.invoke("manager:hotKeyUnwatch", option);
};

const searchFastPanelAction = async (
    query: {
        currentFiles: any[];
        currentImage: string;
    },
    option?: {}
) => {
    return ipcRenderer.invoke("manager:searchFastPanelAction", query, option);
};

const searchAction = async (
    query: {
        keywords: string;
        currentFiles: any[];
        currentImage: string;
    },
    option?: {}
) => {
    return ipcRenderer.invoke("manager:searchAction", query, option);
};

const listDetachWindowActions = async (option?: {}) => {
    return ipcRenderer.invoke("manager:listDetachWindowActions", option);
};

const subInputChange = (keywords: string, option?: {}) => {
    return ipcRenderer.invoke("manager:subInputChange", keywords, option);
};

const openPlugin = async (pluginName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:openPlugin", pluginName, option);
};

const openAction = async (action: ActionRecord) => {
    return ipcRenderer.invoke("manager:openAction", action);
};

const openActionCode = async (id: string) => {
    return ipcRenderer.invoke("manager:openActionCode", id);
}

const searchActionCode = async (keywords: string) => {
    return ipcRenderer.invoke("manager:searchActionCode", keywords);
}

const openActionWindow = async (type: "open" | "close", action: ActionRecord) => {
    return ipcRenderer.invoke("manager:openActionWindow", type, action);
};

const closeMainPlugin = async (option?: {}) => {
    return ipcRenderer.invoke("manager:closeMainPlugin", option);
};

const openMainPluginDevTools = async (option?: {}) => {
    return ipcRenderer.invoke("manager:openMainPluginDevTools", option);
};

const openMainPluginLog = async (option?: {}) => {
    return ipcRenderer.invoke("manager:openMainPluginLog", option);
};

const detachPlugin = async (option?: {}) => {
    return ipcRenderer.invoke("manager:detachPlugin", option);
};

const toggleDetachPluginAlwaysOnTop = async (alwaysOnTop: boolean, option?: {}) => {
    return ipcRenderer.invoke("manager:toggleDetachPluginAlwaysOnTop", alwaysOnTop, option);
};

const setDetachPluginZoom = async (zoom: number, option?: {}) => {
    return ipcRenderer.invoke("manager:setDetachPluginZoom", zoom, option);
};

const firePluginMoreMenuClick = async (name: string, option?: {}) => {
    return ipcRenderer.invoke("manager:firePluginMoreMenuClick", name, option);
};

const fireDetachOperateClick = async (name: string, option?: {}) => {
    return ipcRenderer.invoke("manager:fireDetachOperateClick", name, option);
};

const closeDetachPlugin = async (option?: {}) => {
    return ipcRenderer.invoke("manager:closeDetachPlugin");
};

const openDetachPluginDevTools = async (option?: {}) => {
    return ipcRenderer.invoke("manager:openDetachPluginDevTools", option);
};

const openDetachPluginLog = async (option?: {}) => {
    return ipcRenderer.invoke("manager:openDetachPluginLog", option);
};

const setPluginAutoDetach = async (autoDetach: boolean, option?: {}) => {
    return ipcRenderer.invoke("manager:setPluginAutoDetach", autoDetach, option);
};

const getPluginConfig = async (pluginName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:getPluginConfig", pluginName, option);
};

const listFilePluginRecords = async (option?: {}) => {
    return ipcRenderer.invoke("manager:listFilePluginRecords", option);
};

const updateFilePluginRecords = async (records: PluginRecord[], option?: {}) => {
    return ipcRenderer.invoke("manager:updateFilePluginRecords", records, option);
};

const listLaunchRecords = async (option?: {}) => {
    return ipcRenderer.invoke("manager:listLaunchRecords", option);
};

const updateLaunchRecords = async (records: PluginRecord[], option?: {}) => {
    return ipcRenderer.invoke("manager:updateLaunchRecords", records, option);
};

const storeInstall = async (pluginName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:storeInstall", pluginName, option);
};

const storePublish = async (pluginName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:storePublish", pluginName, option);
};

const storePublishInfo = async (pluginName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:storePublishInfo", pluginName, option);
};

const storeInstallingInfo = async (pluginName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:storeInstallingInfo", pluginName, option);
};

const clipboardList = async (option?: {}) => {
    return ipcRenderer.invoke("manager:clipboardList", option);
};

const clipboardClear = async (option?: {}) => {
    return ipcRenderer.invoke("manager:clipboardClear", option);
};

const clipboardDelete = async (timestamp: number, option?: {}) => {
    return ipcRenderer.invoke("manager:clipboardDelete", timestamp, option);
};

const historyClear = async (option?: {}) => {
    return ipcRenderer.invoke("manager:historyClear", option);
};

const historyDelete = async (pluginName: string, actionName: string, option?: {}) => {
    return ipcRenderer.invoke("manager:historyDelete", pluginName, actionName, option);
};

export default {
    getConfig,
    setConfig,

    isShown,
    show,
    hide,

    getClipboardContent,
    getClipboardChangeTime,
    getSelectedContent,
    listPlugin,
    installPlugin,
    refreshInstallPlugin,
    uninstallPlugin,
    getPluginInstalledVersion,
    listDisabledActionMatch,
    toggleDisabledActionMatch,
    listPinAction,
    togglePinAction,
    showLog,
    clearCache,
    hotKeyWatch,
    hotKeyUnwatch,

    searchFastPanelAction,
    searchAction,
    listDetachWindowActions,
    subInputChange,
    openPlugin,
    openAction,
    openActionCode,
    searchActionCode,
    openActionWindow,
    closeMainPlugin,
    openMainPluginDevTools,
    openMainPluginLog,
    detachPlugin,

    toggleDetachPluginAlwaysOnTop,
    setDetachPluginZoom,
    firePluginMoreMenuClick,
    fireDetachOperateClick,
    closeDetachPlugin,
    openDetachPluginDevTools,
    openDetachPluginLog,
    setPluginAutoDetach,
    getPluginConfig,

    listFilePluginRecords,
    updateFilePluginRecords,
    listLaunchRecords,
    updateLaunchRecords,

    storeInstall,
    storePublish,
    storePublishInfo,
    storeInstallingInfo,

    clipboardList,
    clipboardClear,
    clipboardDelete,

    historyClear,
    historyDelete,
};
