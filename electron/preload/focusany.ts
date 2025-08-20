import os from "os";
import electronRemote from "@electron/remote";
import path from "path";
import fs from "fs";
import {EncodeUtil, FileUtil, HotKeyUtil, StrUtil, TimeUtil} from "../lib/util";
import {ipcRenderer, shell} from "electron";
import {isMac} from "../lib/env";

const ipcSendSync = (type: string, data?: any) => {
    executeHook("Log", `${type}`, data);
    const result = ipcRenderer.sendSync("FocusAny.Plugin", {
        type,
        data,
    });
    executeHook("Log", `${type}.result`, result);
    if (result instanceof Error) throw result;
    return result;
};

const ipcSendAsync = async (type: string, data?: any) => {
    executeHook("Log", `${type}`, data);
    const result = await ipcRenderer.invoke("FocusAny.Plugin.Async", {
        type,
        data,
    });
    executeHook("Log", `${type}.result`, result);
    if (result instanceof Error) throw result;
    return result;
};

const ipcSend = (type: string, data?: any) => {
    ipcRenderer.send("FocusAny.Plugin", {
        type,
        data,
    });
    executeHook("Log", `${type}`, data);
};

const ipcSendToHost = (type: string, data?: any, hasResult?: boolean): Promise<any> => {
    hasResult = hasResult || false;
    const id = StrUtil.randomString(16);
    return new Promise((resolve, reject) => {
        if (hasResult) {
            const timeoutTimer = setTimeout(() => {
                executeHook("Log", `${type}.timeout`);
                ipcRenderer.removeAllListeners(`FocusAny.View.${id}`);
                reject(new Error("timeout"));
            }, 60 * 1000);
            ipcRenderer.once(`FocusAny.View.${id}`, (_event, result) => {
                executeHook("Log", `${type}.result`, result);
                clearTimeout(timeoutTimer);
                resolve(result);
            });
        }
        ipcRenderer.sendToHost("FocusAny.View", {
            id,
            type,
            data,
        });
        executeHook("Log", `${type}`, data);
        if (!hasResult) {
            resolve(null);
        }
    });
};

const executeHook = (hook: string, ...data: any[]) => {
    hook = `on${hook}`;
    if (FocusAny.hooks[hook]) {
        FocusAny.hooks[hook](...data);
    }
};

export const FocusAny = {
    hooks: {} as any,
    onPluginReady(cb: Function) {
        FocusAny.hooks.onPluginReady = cb;
    },
    onPluginExit(cb: Function) {
        FocusAny.hooks.onPluginExit = cb;
    },

    onPluginEvent(event: PluginEvent, callback: (data: any) => void) {
        if (!("onPluginEvent" in FocusAny.hooks)) {
            FocusAny.hooks.onPluginEvent = (payload: { event: string; data: any }) => {
                const {event, data} = payload;
                if (event in FocusAny.hooks.onPluginEventCallbacks) {
                    FocusAny.hooks.onPluginEventCallbacks[event].forEach((cb: (data: any) => void) => {
                        cb(data);
                    });
                }
            };
        }
        if (!("onPluginEventCallbacks" in FocusAny.hooks)) {
            FocusAny.hooks.onPluginEventCallbacks = {};
        }
        if (!(event in FocusAny.hooks.onPluginEventCallbacks)) {
            FocusAny.hooks.onPluginEventCallbacks[event] = [];
        }
        FocusAny.hooks.onPluginEventCallbacks[event].push(callback);
        ipcSend("registerPluginEvent", {event});
    },
    offPluginEvent(event: PluginEvent, callback: (data: any) => void) {
        if (!("onPluginEventCallbacks" in FocusAny.hooks)) {
            FocusAny.hooks.onPluginEventCallbacks = {};
        }
        if (!(event in FocusAny.hooks.onPluginEventCallbacks)) {
            return;
        }
        FocusAny.hooks.onPluginEventCallbacks[event] = FocusAny.hooks.onPluginEventCallbacks[event].filter(
            c => c !== callback
        );
        if (FocusAny.hooks.onPluginEventCallbacks[event].length === 0) {
            delete FocusAny.hooks.onPluginEventCallbacks[event];
            ipcSend("unregisterPluginEvent", {event});
        }
    },
    offPluginEventAll(event: PluginEvent) {
        if (!("onPluginEventCallbacks" in FocusAny.hooks)) {
            FocusAny.hooks.onPluginEventCallbacks = {};
        }
        if (!(event in FocusAny.hooks.onPluginEventCallbacks)) {
            return;
        }
        delete FocusAny.hooks.onPluginEventCallbacks[event];
        ipcSend("unregisterPluginEvent", {event});
    },

    onMoreMenuClick(callback: (data: { name: string }) => void) {
        FocusAny.hooks.onMoreMenuClick = callback;
    },

    registerHotkey(key: string | string[] | HotkeyQuickType | HotkeyType | HotkeyType[], callback: () => void) {
        if ("save" === key) {
            if (isMac) {
                key = "Command+S";
            } else {
                key = "Ctrl+S";
            }
        }
        const hotkeys = HotKeyUtil.unify(key);
        if (!("hotKeyListeners" in FocusAny.hooks)) {
            FocusAny.hooks.hotKeyListeners = [];
            FocusAny.hooks.onHotkey = (payload: { id: string; hotkey: HotkeyType }) => {
                const {id, hotkey} = payload;
                FocusAny.hooks.hotKeyListeners.forEach(
                    (listener: { id: string; hotkeys: HotkeyType[]; callback: () => void }) => {
                        if (listener.id === id) {
                            listener.callback();
                        }
                    }
                );
            };
        }
        const id = StrUtil.randomString(16);
        FocusAny.hooks.hotKeyListeners.push({id, hotkeys, callback});
        ipcSend("registerHotkey", {id, hotkeys});
    },
    unregisterHotkeyAll() {
        FocusAny.hooks.hotKeyListeners = [];
        ipcSend("unregisterHotkeyAll", {});
    },
    onLog(cb: Function) {
        FocusAny.hooks.onLog = cb;
    },
    isMacOs() {
        return os.type() === "Darwin";
    },
    isWindows() {
        return os.type() === "Windows_NT";
    },
    isLinux() {
        return os.type() === "Linux";
    },
    getPlatformArch() {
        return ipcSendSync("getPlatformArch");
    },
    isMainWindowShown(): boolean {
        return ipcSendSync("isMainWindowShown");
    },
    hideMainWindow() {
        ipcSend("hideMainWindow", {});
    },
    showMainWindow() {
        ipcSend("showMainWindow", {});
    },
    isFastPanelWindowShown() {
        return ipcSendSync("isFastPanelWindowShown");
    },
    showFastPanelWindow() {
        ipcSend("showFastPanelWindow", {});
    },
    hideFastPanelWindow() {
        ipcSend("hideFastPanelWindow", {});
    },
    showOpenDialog(options: {
        title?: string;
        defaultPath?: string;
        buttonLabel?: string;
        filters?: { name: string; extensions: string[] }[];
        properties?: Array<
            | "openFile"
            | "openDirectory"
            | "multiSelections"
            | "showHiddenFiles"
            | "createDirectory"
            | "promptToCreate"
            | "noResolveAliases"
            | "treatPackageAsDirectory"
            | "dontAddToRecent"
        >;
        message?: string;
        securityScopedBookmarks?: boolean;
    }): string[] | undefined {
        return ipcSendSync("showOpenDialog", options);
    },
    showSaveDialog(options: {
        title?: string;
        defaultPath?: string;
        buttonLabel?: string;
        filters?: { name: string; extensions: string[] }[];
        message?: string;
        nameFieldLabel?: string;
        showsTagField?: string;
        properties?: Array<
            | "showHiddenFiles"
            | "createDirectory"
            | "treatPackageAsDirectory"
            | "showOverwriteConfirmation"
            | "dontAddToRecent"
        >;
        securityScopedBookmarks?: boolean;
    }): string | undefined {
        return ipcSendSync("showSaveDialog", options);
    },
    setExpendHeight(height: number) {
        ipcSend("setExpendHeight", height);
    },
    setSubInput(onChange: Function, placeholder: string = "", isFocus: boolean = true, isVisible: boolean = true) {
        if (typeof onChange === "function") {
            FocusAny.hooks.onSubInputChange = onChange;
        }
        ipcSendSync("setSubInput", {
            placeholder,
            isFocus,
            isVisible,
        });
    },
    removeSubInput() {
        delete FocusAny.hooks.onSubInputChange;
        ipcSendSync("removeSubInput");
    },
    setSubInputValue(text: string) {
        ipcSendSync("setSubInputValue", {text});
    },
    subInputBlur() {
        ipcSendSync("subInputBlur");
    },
    getPluginRoot() {
        return ipcSendSync("getPluginRoot");
    },
    getPluginConfig() {
        return ipcSendSync("getPluginConfig");
    },
    getPluginInfo() {
        return ipcSendSync("getPluginInfo");
    },
    getPluginEnv(): "dev" | "prod" {
        return ipcSendSync("getPluginEnv");
    },
    getQuery(requestId: string): SearchQuery {
        return ipcSendSync("getQuery", {requestId});
    },
    getPath(
        name:
            | "home"
            | "appData"
            | "userData"
            | "temp"
            | "exe"
            | "desktop"
            | "documents"
            | "downloads"
            | "music"
            | "pictures"
            | "videos"
            | "logs"
    ) {
        return ipcSendSync("getPath", {name});
    },
    showToast(
        body: string,
        options?: {
            duration?: number;
            status?: "info" | "success" | "error";
        }
    ): void {
        ipcSend("showToast", {body, options});
    },
    showNotification(body: string, clickActionName?: string) {
        ipcSend("showNotification", {body, clickActionName});
    },
    showMessageBox(
        message: string,
        options: {
            title?: string;
            yes?: string;
            no?: string;
        }
    ) {
        options = options || {};
        return ipcSendSync("showMessageBox", {
            message,
            ...options,
        });
    },

    copyImage(image: string) {
        return ipcSendSync("copyImage", {image});
    },
    copyText(text: string) {
        return ipcSendSync("copyText", {text});
    },
    copyFile(file: string | string[]) {
        return ipcSendSync("copyFile", {file});
    },
    getClipboardText() {
        return ipcSendSync("getClipboardText", {});
    },
    getClipboardImage() {
        return ipcSendSync("getClipboardImage", {});
    },
    getClipboardFiles(): {
        name: string;
        pathname: string;
        isDirectory: boolean;
        size: number;
        lastModified: number;
    }[] {
        return ipcSendSync("getClipboardFiles");
    },
    async listClipboardItems(option?: { limit?: number }): Promise<{
        type: "file" | "image" | "text";
        timestamp: number;
        files?: FileItem[];
        image?: string;
        text?: string;
    }[]> {
        return ipcSendAsync("listClipboardItems", {option});
    },
    async deleteClipboardItem(timestamp: number): Promise<void> {
        return ipcSendAsync("deleteClipboardItem", {timestamp});
    },
    async clearClipboardItems(): Promise<void> {
        return ipcSendAsync("clearClipboardItems");
    },
    shellOpenExternal(url: string) {
        shell.openExternal(url).then();
    },
    shellOpenPath(path: string) {
        shell.openPath(path).then();
    },
    shellShowItemInFolder(path: string) {
        ipcSend("shellShowItemInFolder", {path});
    },
    shellBeep() {
        ipcSend("shellBeep");
    },
    getFileIcon(path: string) {
        return ipcSendSync("getFileIcon", {path});
    },

    simulate: {
        keyboardTap(key: string, modifiers: ("ctrl" | "shift" | "command" | "option" | "alt")[]) {
            ipcSend("simulateKeyboardTap", {key, modifiers});
        },
        typeString(text: string) {
            ipcSend("simulateTypeString", {text});
        },
        mouseToggle(type: 'down' | 'up', button: 'left' | 'right' | 'middle') {
            ipcSend("simulateMouseToggle", {type, button});
        },
        mouseMove(x: number, y: number) {
            ipcSend("simulateMouseMove", {x, y});
        },
        mouseClick(button: 'left' | 'right' | 'middle', double?: boolean) {
            ipcSend("simulateMouseClick", {button, double});
        }
    },

    getCursorScreenPoint() {
        return electronRemote.screen.getCursorScreenPoint();
    },
    getDisplayNearestPoint(point: { x: number; y: number }) {
        return electronRemote.screen.getDisplayNearestPoint(point);
    },
    createBrowserWindow(url: string, options: BrowserWindow.InitOptions, callback?: () => void) {
        // console.log('createBrowserWindow', JSON.stringify(url))
        const pluginRoot = this.getPluginRoot();
        // console.log('createBrowserWindow', JSON.stringify(url))
        let preloadPath = null;
        options = (options || {}) as BrowserWindow.InitOptions;
        if (options.webPreferences && options.webPreferences.preload) {
            preloadPath = path.join(pluginRoot, options.webPreferences.preload);
        }
        let win = new electronRemote.BrowserWindow({
            useContentSize: true,
            resizable: true,
            title: options.title || "新窗口",
            show: true,
            backgroundColor: "#fff",
            ...options,
            webPreferences: {
                webSecurity: false,
                backgroundThrottling: false,
                contextIsolation: false,
                webviewTag: true,
                nodeIntegration: true,
                spellcheck: false,
                partition: null,
                ...(options.webPreferences || {}),
                preload: preloadPath,
            },
        });
        if (url.startsWith("file://") || url.startsWith("http://") || url.startsWith("https://")) {
            win.loadURL(url);
        } else {
            win.loadFile(url);
        }
        win.on("closed", () => {
            win = undefined;
        });
        win.once("ready-to-show", () => {
            win.show();
        });
        win.webContents.on("dom-ready", () => {
            callback && callback();
        });
        return win;
    },
    screenCapture(cb: (imgBase64: string) => void): void {
        FocusAny.hooks.onScreenCapture = (data: { image: string }) => {
            // console.log('onScreenCapture', data)
            cb && cb(data.image);
        };
        ipcSendSync("screenCapture");
    },
    getNativeId(): string {
        return ipcSendSync("getNativeId");
    },
    getAppVersion(): string {
        return ipcSendSync("getAppVersion");
    },
    outPlugin() {
        ipcSend("outPlugin");
    },
    isDarkColors() {
        return ipcSendSync("isDarkColors");
    },
    redirect(keywordsOrAction: string | string[], query?: SearchQuery): void {
        ipcSend("redirect", {keywordsOrAction, query});
    },
    getActions(names?: string[]): PluginAction[] {
        return ipcSendSync("getActions", {names});
    },
    setAction(action: PluginAction | PluginAction[]) {
        ipcSendSync("setAction", {action});
    },
    removeAction(name: string) {
        ipcSendSync("removeAction", {name});
    },

    sendBackendEvent(
        event: string,
        data?: any,
        option?: {
            timeout: number;
        }
    ): Promise<any> {
        option = Object.assign({
            timeout: 10 * 1000,
        });
        return new Promise((resolve, reject) => {
            const id = StrUtil.randomString(16);
            const timeoutTimer = setTimeout(() => {
                ipcRenderer.removeAllListeners(`FocusAny.Event.${id}`);
                reject(new Error("timeout"));
            }, option.timeout);
            ipcRenderer.once(`FocusAny.Event.${id}`, (_event, result) => {
                clearTimeout(timeoutTimer);
                resolve(result);
            });
            ipcRenderer.send("FocusAny.Event", {
                id,
                event,
                data,
            });
        });
    },

    setRemoteWebRuntime(info: {
        userAgent: string;
        urlMap: Record<string, string>;
        types: string[];
        domains: string[];
        blocks: string[];
    }): Promise<undefined> {
        return ipcSendAsync("setRemoteWebRuntime", {info});
    },

    llmListModels(): Promise<{
        providerId: string;
        providerLogo: string;
        providerTitle: string;
        modelId: string;
        modelName: string;
    }[]> {
        return ipcSendAsync("llmListModels");
    },

    llmChat(callInfo: {
        providerId: string;
        modelId: string;
        message: string;
    }): Promise<{
        code: number;
        msg: string;
        data?: {
            message: string;
        };
    }> {
        return ipcSendAsync("llmChat", {callInfo});
    },

    logInfo(label: string, data?: any): void {
        ipcSend("logInfo", {label, logData: data});
    },

    logError(label: string, data?: any): void {
        ipcSend("logError", {label, logData: data});
    },

    logPath(): Promise<string> {
        return ipcSendSync("logPath");
    },

    logShow(): void {
        ipcSend("logShow");
    },

    async addLaunch(keyword: string, name: string, hotkey: HotkeyType): Promise<void> {
        return ipcSendAsync("addLaunch", {keyword, name, hotkey});
    },

    async removeLaunch(keyword: string): Promise<void> {
        return ipcSendAsync("removeLaunch", {keyword});
    },

    async activateLatestWindow(): Promise<void> {
        return ipcSendAsync("activateLatestWindow");
    },

    showUserLogin() {
        ipcSend("showUserLogin");
    },

    getUser() {
        return ipcSendSync("getUser");
    },

    getUserAccessToken(): Promise<{ token: string; expireAt: number }> {
        return ipcSendAsync("getUserAccessToken");
    },

    listGoods(query?: { ids?: string[] }): Promise<
        {
            id: string;
            title: string;
            cover: string;
            priceType: "fixed" | "dynamic";
            fixedPrice: string;
            description: string;
        }[]
    > {
        return ipcSendAsync("listGoods", {query});
    },

    openGoodsPayment(options: { goodsId: string; price?: string; outOrderId?: string; outParam?: string }): Promise<{
        paySuccess: boolean;
    }> {
        return ipcSendAsync("openGoodsPayment", {options});
    },

    queryGoodsOrders(options: { goodsId?: string; page?: number; pageSize?: number }): Promise<{
        page: number;
        total: number;
        records: {
            id: string;
            goodsId: string;
            status: "Paid" | "Unpaid";
        }[];
    }> {
        return ipcSendAsync("queryGoodsOrders", {options});
    },

    apiPost(
        url: string,
        body: any,
        option: {}
    ): Promise<{
        code: number;
        msg: string;
        data: any;
    }> {
        return ipcSendAsync("apiPost", {url, body, option});
    },

    file: {
        exists(path: string): Promise<boolean> {
            return ipcSendAsync("fileExists", {path});
        },
        read(path: string): Promise<string> {
            return ipcSendAsync("fileRead", {path});
        },
        write(path: string, data: string): Promise<void> {
            return ipcSendAsync("fileWrite", {path, data});
        },
        remove(path: string): Promise<void> {
            return ipcSendAsync("fileRemove", {path});
        },
        ext(path: string): Promise<string> {
            return ipcSendAsync("fileExt", {path});
        },
    },

    db: {
        put(doc: DbDoc) {
            return ipcSendSync("dbPut", {doc});
        },
        get<T extends {} = Record<string, any>>(id: string): DbDoc<T> | null {
            return ipcSendSync("dbGet", {id});
        },
        remove(doc: string | DbDoc): DbReturn {
            return ipcSendSync("dbRemove", {doc});
        },
        bulkDocs(docs: DbDoc[]): DbReturn[] {
            return ipcSendSync("dbBulkDocs", {docs});
        },
        allDocs<T extends {} = Record<string, any>>(key?: string): DbDoc<T>[] {
            return ipcSendSync("dbAllDocs", {key});
        },
        postAttachment(docId: string, attachment: Buffer | Uint8Array, type: string): DbReturn {
            return ipcSendSync("dbPostAttachment", {
                docId,
                attachment,
                type,
            });
        },
        getAttachment(docId: string): Uint8Array | null {
            return ipcSendSync("dbGetAttachment", {docId});
        },
        getAttachmentType(docId: string): string | null {
            return ipcSendSync("dbGetAttachmentType", {docId});
        },
    },
    dbStorage: {
        setItem(key: string, value: any) {
            return ipcSendSync("dbStorageSetItem", {key, value});
        },
        getItem(key: string) {
            return ipcSendSync("dbStorageGetItem", {key});
        },
        removeItem(key: string) {
            return ipcSendSync("dbStorageRemoveItem", {key});
        },
    },

    view: {
        setHeight(height: number) {
            ipcSendToHost("view.setHeight", {height}).then();
        },
        getHeight(): Promise<number> {
            return ipcSendToHost("view.getHeight", {}, true);
        },
    },

    fad: {
        async read(type: string, path: string): Promise<any> {
            const fileData = await ipcSendAsync("fileRead", {path});
            if (!fileData) {
                throw "文件不存在或读取失败";
            }
            const fileDataJson = JSON.parse(fileData);
            if (fileDataJson["type"] !== type) {
                throw "不支持的文件类型";
            }
            return fileDataJson["data"];
        },
        async write(type: string, path: string, data: any): Promise<void> {
            const fileData = {
                type,
                data,
            };
            const fileDataJson = JSON.stringify(fileData, null, 2);
            await ipcSendAsync("fileWrite", {path, data: fileDataJson});
        },
    },

    detach: {
        setTitle(title: string) {
            ipcSend("detachSetTitle", {title});
        },
        setOperates(
            operates: {
                name: string;
                title: string;
                click: () => void;
            }[]
        ) {
            const cleanOperates = operates.map(o => {
                return {
                    name: o.name,
                    title: o.title,
                };
            });
            if (!("onDetachOperateClick" in FocusAny.hooks)) {
                FocusAny.hooks.onDetachOperateClick = (payload: { name: string }) => {
                    const {name} = payload;
                    FocusAny.hooks.detachOperates.forEach(o => {
                        if (o.name === name) {
                            o.click();
                        }
                    });
                };
            }
            FocusAny.hooks.detachOperates = operates.map(o => {
                return {
                    name: o.name,
                    title: o.title,
                    click: o.click,
                };
            });
            ipcSend("detachSetOperates", {operates: cleanOperates});
        },
        setPosition(position: "center" | "right-bottom" | "left-top" | "right-top" | "left-bottom") {
            ipcSend("detachSetPosition", {position});
        },
        setAlwaysOnTop(alwaysOnTop: boolean) {
            ipcSend("detachSetAlwaysOnTop", {alwaysOnTop});
        },
        setSize(width: number, height: number) {
            ipcSend("detachSetSize", {width, height});
        },
    },

    util: {
        randomString(length: number): string {
            return StrUtil.randomString(length);
        },
        bufferToBase64(buffer: Buffer): string {
            return FileUtil.bufferToBase64(buffer);
        },
        base64ToBuffer(base64: string): Buffer {
            return FileUtil.base64ToBuffer(base64);
        },
        datetimeString(): string {
            return TimeUtil.datetimeString();
        },
        base64Encode(data: any): string {
            return EncodeUtil.base64Encode(data);
        },
        base64Decode(data: string): any {
            return EncodeUtil.base64Decode(data);
        },
        md5(data: string): string {
            return EncodeUtil.md5(data);
        },
        save(
            filename: string,
            data: string | Uint8Array,
            option?: {
                isBase64?: boolean;
            }
        ): boolean {
            const path = FocusAny.showSaveDialog({
                defaultPath: filename,
            });
            if (!path) {
                return false;
            }
            if (option?.isBase64) {
                // remove prefix data:image/svg+xml;base64,
                if ((data as string).startsWith("data:")) {
                    data = (data as string).split(",")[1];
                }
                data = Buffer.from(data as string, "base64");
            }
            fs.writeFileSync(path, data as Uint8Array);
            return true;
        },
    },
};
