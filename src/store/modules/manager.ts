import {defineStore} from "pinia";
import store from "../index";
import {ActionRecord, ActionTypeEnum, ConfigRecord, PluginRecord} from "../../types/Manager";
import debounce from "lodash/debounce";
import {WindowConfig} from "../../../electron/config/window";
import {computed, toRaw} from "vue";
import {TimeUtil} from "../../lib/util";

const searchFastPanelActionDebounce = debounce((query, cb) => {
    window.$mapi.manager.searchFastPanelAction(query).then(result => {
        cb(result);
    });
});

const searchDebounce = debounce((query, cb) => {
    window.$mapi.manager.searchAction(query).then(result => {
        cb(result);
    });
}, 300);

const subInputChangeDebounce = debounce(keywords => {
    window.$mapi.manager.subInputChange(keywords);
}, 300);

export const managerStore = defineStore("manager", {
    state: () => ({
        config: {} as ConfigRecord,
        searchLoading: false,
        searchLastKeywords: "",
        searchValueUpdateTimestamp: 0,
        searchValue: "",
        searchPlaceholder: "FocusAny，让您的工作专注高效",
        searchSubPlaceholder: "",
        searchSubIsVisible: false,
        searchIsCompositing: false,

        detachWindowActions: [] as ActionRecord[],
        searchActions: [] as ActionRecord[],
        matchActions: [] as ActionRecord[],
        historyActions: [] as ActionRecord[],
        pinActions: [] as ActionRecord[],
        viewActions: [] as ActionRecord[],

        selectedAction: null as ActionRecord | null,
        activePlugin: null as PluginRecord | null,

        currentFiles: [] as FileItem[],
        currentImage: "",
        currentText: "",

        fastPanelActionLoading: false,
        fastPanelMatchActions: [] as ActionRecord[],
        fastPanelViewActions: [] as ActionRecord[],

        notice: null as {
            text: string;
            type: "info" | "error" | "success";
            duration: number;
        } | null,
        noticeCleanTimer: null as any,
    }),
    actions: {
        async init() {
            this.config = await window.$mapi.manager.getConfig();
        },

        async setConfig(key: string, value: any) {
            // console.log('setConfig', key, value, toRaw(this.config))
            this.config[key] = value;
            await window.$mapi.manager.setConfig(toRaw(this.config));
        },
        async onConfigChange(key: string, value: any) {
            return await this.setConfig(key, toRaw(value));
        },
        configGet(key: string, defaultValue: any = null) {
            return computed(() => {
                if (key in this.config) {
                    return this.config[key];
                }
                return defaultValue;
            });
        },

        setActivePlugin(plugin: PluginRecord | null) {
            this.activePlugin = plugin;
        },
        setSearchValue(value: string) {
            if (this.activePlugin) {
                return;
            }
            this.searchValue = value;
        },
        setSelectedAction(action: ActionRecord) {
            this.selectedAction = action;
            document.querySelector(`[data-action="${action.fullName}"]`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center",
            });
        },
        setCurrentFiles(files: FileItem[]) {
            this.currentFiles = files;
        },
        setCurrentImage(image: string) {
            this.currentImage = image;
        },
        setCurrentText(text: string) {
            this.currentText = text;
        },

        async searchFastPanel(keywords: string) {
            this.fastPanelMatchActions = [];
            this.fastPanelViewActions = [];
            this.fastPanelActionLoading = true;
            searchFastPanelActionDebounce(
                {
                    keywords: keywords,
                    currentFiles: toRaw(this.currentFiles),
                    currentImage: this.currentImage,
                    currentText: this.currentText,
                },
                (result: {matchActions: ActionRecord[]; viewActions: ActionRecord[]}) => {
                    this.fastPanelMatchActions = result.matchActions;
                    this.fastPanelViewActions = result.viewActions;
                    this.fastPanelActionLoading = false;
                }
            );
        },

        async searchRefresh() {
            await this.search(this.searchLastKeywords);
        },

        async search(keywords: string) {
            if (this.activePlugin) {
                subInputChangeDebounce(keywords);
                this.searchValue = keywords;
                return;
            }
            this.searchLoading = true;
            this.searchValue = keywords;
            this.searchValueUpdateTimestamp = TimeUtil.timestamp();
            this.viewActions = [];
            searchDebounce(
                {
                    keywords,
                    currentFiles: toRaw(this.currentFiles),
                    currentImage: this.currentImage,
                    currentText: this.currentText,
                },
                (result: {
                    detachWindowActions: ActionRecord[];
                    searchActions: ActionRecord[];
                    matchActions: ActionRecord[];
                    viewActions: ActionRecord[];
                    historyActions: ActionRecord[];
                    pinActions: ActionRecord[];
                }) => {
                    this.searchLastKeywords = keywords;
                    this.detachWindowActions = result.detachWindowActions;
                    this.searchActions = result.searchActions;
                    this.matchActions = result.matchActions;
                    this.viewActions = result.viewActions;
                    this.historyActions = result.historyActions;
                    this.pinActions = result.pinActions;
                    this.searchLoading = false;
                }
            );
        },
        async detachWindowActionsRefresh() {
            this.detachWindowActions = await window.$mapi.manager.listDetachWindowActions();
        },
        async resize(width: number, height: number) {
            height = Math.min(height, WindowConfig.mainMaxHeight);
            await window.$mapi.app.windowSetSize(null, WindowConfig.mainWidth, height, {
                center: false,
            });
        },
        async isMainWindowShown() {
            return await window.$mapi.manager.isShown();
        },
        async showMainWindow() {
            await window.$mapi.manager.show();
        },
        async hideMainWindow() {
            await window.$mapi.manager.hide();
        },
        async openAction(action: ActionRecord, group: undefined | "window" = undefined) {
            await window.$mapi.manager.openAction(toRaw(action));
            if (
                action.type === ActionTypeEnum.COMMAND ||
                action.type === ActionTypeEnum.CODE ||
                action.type === ActionTypeEnum.BACKEND
            ) {
                this.searchValue = "";
                await window.$mapi.manager.hide();
            }
            this.detachWindowActions = [];
            this.searchActions = [];
            this.matchActions = [];
            this.viewActions = [];
            this.historyActions = [];
            this.pinActions = [];
        },
        async openActionForWindow(type: "open", action: ActionRecord) {
            await window.$mapi.manager.openActionForWindow(type, toRaw(action));
        },
        async closeMainPlugin(plugin?: PluginRecord) {
            await window.$mapi.manager.closeMainPlugin(plugin ? toRaw(plugin) : null);
        },
        async openMainPluginDevTools(plugin?: PluginRecord) {
            await window.$mapi.manager.openMainPluginDevTools(plugin ? toRaw(plugin) : null);
        },
        async detachPlugin() {
            await window.$mapi.manager.detachPlugin();
        },
        setSubInput(payload: {placeholder: string; isFocus: boolean; isVisible: boolean}) {
            if (!this.activePlugin) {
                return;
            }
            this.searchSubPlaceholder = payload.placeholder || "";
            this.searchSubIsVisible = payload.isVisible || false;
        },
        removeSubInput() {
            if (!this.activePlugin) {
                return;
            }
            this.searchSubPlaceholder = "";
            this.searchSubIsVisible = false;
            this.searchValue = "";
        },
        setSubInputValue(value: string) {
            if (!this.activePlugin) {
                return;
            }
            this.searchValue = value;
        },
        onNotice(data: any) {
            this.notice = data;
            if (this.notice?.duration && this.notice?.duration > 0) {
                if (this.noticeCleanTimer) {
                    clearTimeout(this.noticeCleanTimer);
                }
                this.noticeCleanTimer = setTimeout(() => {
                    this.notice = null;
                }, this.notice.duration);
            }
        },
    },
});

const manager = managerStore(store);
manager.init().then();

window.__page.onBroadcast("Notice", manager.onNotice);

export const useManagerStore = () => {
    return manager;
};
