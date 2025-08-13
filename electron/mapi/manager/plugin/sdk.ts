import {PluginRecord} from "../../../../src/types/Manager";
import {ManagerPluginEvent} from "./event";
import {BrowserWindow, screen, shell} from "electron";
import os from "os";
import path from "path";
import {EncodeUtil, FileUtil, StrUtil, TimeUtil} from "../../../lib/util";
import {PluginContext} from "../type";
import {PluginLog} from "./log";

export const PluginSdkCreate = (plugin: PluginRecord) => {
    const context = {
        _window: null,
        _plugin: plugin,
    } as PluginContext;
    const sdk = {
        async isMacOs() {
            return os.type() === "Darwin";
        },
        async isWindows() {
            return os.type() === "Windows_NT";
        },
        async isLinux() {
            return os.type() === "Linux";
        },
        async getPlatformArch() {
            return ManagerPluginEvent.getPlatformArch(context, {});
        },
        async isMainWindowShown() {
            return ManagerPluginEvent.isMainWindowShown(context, {});
        },
        async hideMainWindow() {
            return ManagerPluginEvent.hideMainWindow(context, {});
        },
        async showMainWindow() {
            return ManagerPluginEvent.showMainWindow(context, {});
        },
        async isFastPanelWindowShown() {
            return ManagerPluginEvent.isFastPanelWindowShown(context, {});
        },
        async showFastPanelWindow() {
            return ManagerPluginEvent.showFastPanelWindow(context, {});
        },
        async hideFastPanelWindow() {
            return ManagerPluginEvent.hideFastPanelWindow(context, {});
        },
        async showOpenDialog() {
            return ManagerPluginEvent.showOpenDialog(context, {});
        },
        async showSaveDialog() {
            return ManagerPluginEvent.showSaveDialog(context, {});
        },
        async getPluginRoot() {
            return plugin.runtime?.root;
        },
        async getPluginConfig() {
            return ManagerPluginEvent.getPluginConfig(context, {});
        },
        async getPluginInfo() {
            return ManagerPluginEvent.getPluginInfo(context, {});
        },
        async getPluginEnv() {
            return ManagerPluginEvent.getPluginEnv(context, {});
        },
        async getPath(
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
            return ManagerPluginEvent.getPath(context, {name});
        },
        async showToast(
            body: string,
            options?: {
                duration?: number;
                status?: "info" | "success" | "error";
            }
        ) {
            ManagerPluginEvent.showToast(context, {body, options}).then();
        },
        async showNotification(body: string, clickActionName: string) {
            return ManagerPluginEvent.showNotification(context, {body, clickActionName});
        },
        async showMessageBox(
            message: string,
            options: {
                title?: string;
                yes?: string;
                no?: string;
            }
        ) {
            return ManagerPluginEvent.showMessageBox(context, {message, ...options});
        },
        async copyImage(img: string) {
            return ManagerPluginEvent.copyImage(context, {img});
        },
        async copyText(text: string) {
            return ManagerPluginEvent.copyText(context, {text});
        },
        async copyFile(file: string) {
            return ManagerPluginEvent.copyFile(context, {file});
        },
        async getClipboardText() {
            return ManagerPluginEvent.getClipboardText(context, {});
        },
        async getClipboardImage() {
            return ManagerPluginEvent.getClipboardImage(context, {});
        },
        async getClipboardFiles(): Promise<
            {
                name: string;
                pathname: string;
                isDirectory: boolean;
                size: number;
                lastModified: number;
            }[]
        > {
            return (await ManagerPluginEvent.getClipboardFiles(context, {})) as any;
        },
        async shellOpenExternal(url: string) {
            await shell.openExternal(url);
        },
        async shellOpenPath(path: string) {
            await shell.openPath(path).then();
        },
        async shellShowItemInFolder(path: string) {
            await ManagerPluginEvent.shellShowItemInFolder(context, {path});
        },
        async shellBeep() {
            return ManagerPluginEvent.shellBeep(context, {});
        },
        async getFileIcon(path: string) {
            return ManagerPluginEvent.getFileIcon(context, {path});
        },
        simulate: {
            async keyboardTap(key: string, modifiers: ("ctrl" | "shift" | "command" | "option" | "alt")[]) {
                await ManagerPluginEvent.simulateKeyboardTap(context, {key, modifiers});
            },
            async typeString(text: string) {
                await ManagerPluginEvent.simulateTypeString(context, {text});
            },
            async mouseToggle(type: 'down' | 'up', button: 'left' | 'right' | 'middle') {
                await ManagerPluginEvent.simulateMouseToggle(context, {type, button});
            },
            async mouseMove(x: number, y: number) {
                await ManagerPluginEvent.simulateMouseMove(context, {x, y});
            },
            async mouseClick(button: 'left' | 'right' | 'middle', double?: boolean) {
                await ManagerPluginEvent.simulateMouseClick(context, {button, double});
            }
        },
        async getCursorScreenPoint() {
            return screen.getCursorScreenPoint();
        },
        async getDisplayNearestPoint(point: { x: number; y: number }) {
            return screen.getDisplayNearestPoint(point);
        },
        // sendTo
        async createBrowserWindow(url: string, options: any, callback: any) {
            const pluginRoot = await this.getPluginRoot();
            url = path.join(pluginRoot, url);
            let preloadPath = null;
            if (options.webPreferences && options.webPreferences.preload) {
                preloadPath = path.join(pluginRoot, options.webPreferences.preload);
            }
            if (url.startsWith("http://") || url.startsWith("https://")) {
                // do nothing
            } else {
                url = `file://${url}`;
            }
            options = options || {};
            let win = new BrowserWindow({
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
            win.loadURL(url);
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
        async screenCapture(cb: Function) {
            context["_screenCaptureCallback"] = (data: { image: string }) => {
                cb && cb(data.image);
            };
            return ManagerPluginEvent.screenCapture(context, {cb});
        },
        getNativeId() {
            return ManagerPluginEvent.getNativeId(context, {});
        },
        getAppVersion() {
            return ManagerPluginEvent.getAppVersion(context, {});
        },
        async isDarkColors() {
            return ManagerPluginEvent.isDarkColors(context, {});
        },
        async redirect(keywordsOrAction: string | string[], payload: any) {
            return ManagerPluginEvent.redirect(context, {keywordsOrAction, payload});
        },
        async getActions(names?: string[]) {
            return ManagerPluginEvent.getActions(context, {names});
        },
        async setAction(action: string) {
            return ManagerPluginEvent.setAction(context, {action});
        },
        async removeAction(name: string) {
            return ManagerPluginEvent.removeAction(context, {name});
        },
        async llmListModels(): Promise<{
            providerId: string;
            providerLogo: string;
            providerTitle: string;
            modelId: string;
            modelName: string;
        }[]> {
            return ManagerPluginEvent.llmListModels(context, {});
        },

        async llmChat(callInfo: {
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
            return ManagerPluginEvent.llmChat(context, {callInfo});
        },

        logInfo(label: string, data?: any): void {
            ManagerPluginEvent.logInfo(context, {label, logData: data});
        },

        logError(label: string, data?: any): void {
            ManagerPluginEvent.logError(context, {label, logData: data});
        },

        async logPath(): Promise<string> {
            return ManagerPluginEvent.logPath(context, {});
        },

        logShow(): void {
            ManagerPluginEvent.logShow(context, {});
        },

        async addLaunch(keyword: string, name: string, hotkey: HotkeyType): Promise<void> {
            return ManagerPluginEvent.addLaunch(context, {keyword, name, hotkey});
        },

        async removeLaunch(keyword: string): Promise<void> {
            return ManagerPluginEvent.removeLaunch(context, {keyword});
        },

        async getUser(): Promise<{
            avatar: string;
            nickname: string;
            vipFlag: string;
            deviceCode: string;
        } | null> {
            return ManagerPluginEvent.getUser(context, {});
        },
        async getUserAccessToken(): Promise<{ token: string; expireAt: number }> {
            return ManagerPluginEvent.getUserAccessToken(context, {});
        },
        db: {
            async put(doc: { _id: string; data: any; _rev?: string }) {
                return ManagerPluginEvent.dbPut(context, {doc});
            },
            async get(id: string) {
                return ManagerPluginEvent.dbGet(context, {id});
            },
            async remove(
                doc:
                    | {
                    _id: string;
                }
                    | string
            ) {
                return ManagerPluginEvent.dbRemove(context, {doc});
            },
            async bulkDocs(
                docs: {
                    _id: string;
                    data: any;
                    _rev?: string;
                }[]
            ) {
                return ManagerPluginEvent.dbBulkDocs(context, {docs});
            },
            async allDocs(key: string | string[]) {
                return ManagerPluginEvent.dbAllDocs(context, {key});
            },
            async postAttachment(docId: string, attachment: Buffer | Uint8Array, type: string) {
                return ManagerPluginEvent.dbPostAttachment(context, {docId, attachment, type});
            },
            async getAttachment(docId: string) {
                return ManagerPluginEvent.dbGetAttachment(context, {docId});
            },
            async getAttachmentType(docId: string) {
                return ManagerPluginEvent.dbGetAttachmentType(context, {docId});
            },
        },
        dbStorage: {
            async setItem(key: string, value: any) {
                return ManagerPluginEvent.dbStorageSetItem(context, {key, value});
            },
            async getItem(key: string) {
                return ManagerPluginEvent.dbStorageGetItem(context, {key});
            },
            async removeItem(key: string) {
                return ManagerPluginEvent.dbStorageRemoveItem(context, {key});
            },
        },
        util: {
            randomString(length: number) {
                return StrUtil.randomString(length);
            },
            bufferToBase64(buffer: Buffer) {
                return FileUtil.bufferToBase64(buffer);
            },
            datetimeString() {
                return TimeUtil.datetimeString();
            },
            base64Encode(data: any) {
                return EncodeUtil.base64Encode(data);
            },
            base64Decode(data: string) {
                return EncodeUtil.base64Decode(data);
            },
            md5(data: string) {
                return EncodeUtil.md5(data);
            },
        },
    };

    const createDeepProxy = (target: any, cache = new WeakMap()) => {
        if (typeof target !== 'object' || target === null) {
            return target;
        }
        if (cache.has(target)) {
            return cache.get(target);
        }
        const proxy = new Proxy(target, {
            get(obj, prop) {
                const value = Reflect.get(obj, prop);
                if (typeof value === 'function') {
                    return async function (...args: any[]) {
                        try {
                            return await Promise.resolve(value.apply(obj, args));
                        } catch (error) {
                            PluginLog.error(plugin.name, `Api.Error-${prop.toString()}`, {
                                error: error + '',
                            });
                        }
                    };
                }
                if (typeof value === 'object' && value !== null) {
                    return createDeepProxy(value, cache);
                }
                return value;
            }
        });
        cache.set(target, proxy);
        return proxy;
    };

    return createDeepProxy(sdk);
};
