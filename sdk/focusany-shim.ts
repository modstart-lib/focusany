/// <reference path="focusany.d.ts" />

export const FocusAnyShim = {
    init() {
        if (window["focusany"]) {
            return;
        }

        const focusanySupport: Partial<FocusAnyApi> = {
            onPluginReady(
                callback: (data: {
                    actionName: string;
                    actionMatch: any | null;
                    actionMatchFiles: FileItem[];
                    requestId: string;
                    reenter: boolean;
                    isView: boolean;
                }) => void
            ): void {
                const callbackWrapper = () => {
                    callback({
                        actionName: "",
                        actionMatch: null,
                        actionMatchFiles: [],
                        requestId: "",
                        reenter: false,
                        isView: false,
                    });
                };
                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", callbackWrapper);
                } else {
                    callbackWrapper();
                }
            },
            copyText(text: string): boolean {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text);
                    return true;
                } else {
                    console.error("FocusAny Shim: copyText() requires clipboard permission in web environment");
                    return false;
                }
            },
            isMacOs(): boolean {
                return navigator.platform.toLowerCase().includes("mac");
            },
            isWindows(): boolean {
                return navigator.platform.toLowerCase().includes("win");
            },
            isLinux(): boolean {
                return navigator.platform.toLowerCase().includes("linux");
            },
            // use localStorage with prefix db:xxx to store data
            db: {
                put(doc: DbDoc): DbReturn {
                    const key = `db:${doc._id}`;
                    try {
                        localStorage.setItem(key, JSON.stringify(doc));
                        return {
                            ok: true,
                            id: doc._id,
                            rev: doc._rev || focusanySupport.util.randomString(16),
                        };
                    } catch (e) {
                        console.error("FocusAny Shim: db.put() failed:", e);
                        return {ok: false, id: doc._id, rev: ""};
                    }
                },
                get<T extends {} = Record<string, any>>(id: string): DbDoc<T> | null {
                    const key = `db:${id}`;
                    const value = localStorage.getItem(key);
                    if (value) {
                        try {
                            return JSON.parse(value) as DbDoc<T>;
                        } catch (e) {
                            console.error("FocusAny Shim: db.get() failed:", e);
                            return null;
                        }
                    }
                    return null;
                },
                remove(doc: string | DbDoc): DbReturn {
                    const id = typeof doc === "string" ? doc : doc._id;
                    const key = `db:${id}`;
                    try {
                        localStorage.removeItem(key);
                        return {ok: true, id, rev: ""};
                    } catch (e) {
                        console.error("FocusAny Shim: db.remove() failed:", e);
                        return {ok: false, id, rev: ""};
                    }
                },
                bulkDocs(docs: DbDoc[]): DbReturn[] {
                    const results: DbReturn[] = [];
                    for (const doc of docs) {
                        const result = this.put(doc);
                        results.push(result);
                    }
                    return results;
                },
                allDocs<T extends {} = Record<string, any>>(key?: string): DbDoc<T>[] {
                    const results: DbDoc<T>[] = [];
                    const prefix = key ? `db:${key}` : "db:";
                    for (const item of Object.keys(localStorage)) {
                        if (item.startsWith(prefix)) {
                            const value = localStorage.getItem(item);
                            if (value) {
                                try {
                                    results.push(JSON.parse(value) as DbDoc<T>);
                                } catch (e) {
                                    console.error("FocusAny Shim: db.allDocs() failed:", e);
                                }
                            }
                        }
                    }
                    return results;
                },
                postAttachment(docId: string, attachment: Uint8Array, type: string): DbReturn {
                    const key = `dbAttachment:${docId}`;
                    try {
                        const existing = localStorage.getItem(key);
                        const attachments = existing ? JSON.parse(existing) : {};
                        attachments[type] = focusanySupport.util.bufferToBase64(attachment);
                        localStorage.setItem(key, JSON.stringify(attachments));
                        return {ok: true, id: docId, rev: ""};
                    } catch (e) {
                        console.error("FocusAny Shim: db.postAttachment() failed:", e);
                        return {ok: false, id: docId, rev: ""};
                    }
                },
                getAttachment(docId: string): Uint8Array | null {
                    const key = `dbAttachment:${docId}`;
                    const value = localStorage.getItem(key);
                    if (value) {
                        try {
                            const attachments = JSON.parse(value);
                            const firstKey = Object.keys(attachments)[0];
                            if (firstKey) {
                                return focusanySupport.util.base64ToBuffer(attachments[firstKey]);
                            }
                        } catch (e) {
                            console.error("FocusAny Shim: db.getAttachment() failed:", e);
                        }
                    }
                    return null;
                },
                getAttachmentType(docId: string): string | null {
                    const key = `dbAttachment:${docId}`;
                    const value = localStorage.getItem(key);
                    if (value) {
                        try {
                            const attachments = JSON.parse(value);
                            const firstKey = Object.keys(attachments)[0];
                            return firstKey || null;
                        } catch (e) {
                            console.error("FocusAny Shim: db.getAttachmentType() failed:", e);
                        }
                    }
                    return null;
                },
            },
            dbStorage: {
                setItem(key: string, value: any): void {
                    localStorage.setItem(key, JSON.stringify(value));
                },
                getItem<T = any>(key: string): T {
                    const value = localStorage.getItem(key);
                    return value ? JSON.parse(value) : null;
                },
                removeItem(key: string): void {
                    localStorage.removeItem(key);
                },
            },
            util: {
                randomString(length: number): string {
                    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                    let result = "";
                    for (let i = 0; i < length; i++) {
                        result += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    return result;
                },
                bufferToBase64(buffer: Uint8Array): string {
                    return btoa(String.fromCharCode.apply(null, Array.from(buffer)));
                },
                base64ToBuffer(base64: string): Uint8Array {
                    const binary = atob(base64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    return bytes;
                },
                datetimeString(): string {
                    return new Date().toISOString();
                },
                base64Encode(data: any): string {
                    return btoa(JSON.stringify(data));
                },
                base64Decode(data: string): any {
                    return JSON.parse(atob(data));
                },
                md5(data: string): string {
                    console.error(
                        "FocusAny Shim: util.md5() is not supported in web environment, use crypto.subtle instead"
                    );
                    return "";
                },
                save(filename: string, data: string | Uint8Array, option?: {isBase64?: boolean}): boolean {
                    // 使用浏览器下载功能
                    try {
                        const blob = new Blob([data as any], {type: "application/octet-stream"});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        return true;
                    } catch (e) {
                        console.error("FocusAny Shim: util.save() failed:", e);
                        return false;
                    }
                },
            },
        };

        // 创建一个递归的 Proxy 来处理任意深度的属性访问
        function createErrorProxy(path: string = "focusany", supportObj?: any): any {
            return new Proxy(() => {}, {
                get(target, prop) {
                    const currentPath = `${path}.${String(prop)}`;

                    // 如果是根级别且在支持对象中存在，直接返回
                    if (path === "focusany" && supportObj && prop in supportObj) {
                        return supportObj[prop];
                    }

                    // 对于其他属性，返回一个新的 Proxy（不支持任何属性）
                    return createErrorProxy(currentPath, null);
                },
                apply(target, thisArg, argumentsList) {
                    console.error(`FocusAny Shim: ${path}() is not supported in web environment`);
                    throw new Error(`FocusAny function ${path}() is not available in web environment`);
                },
            });
        }

        // 创建 focusany 对象
        const focusany = createErrorProxy("focusany", focusanySupport);
        // @ts-ignore
        window["focusany"] = focusany;
    },
};

// 自动初始化：在浏览器环境中自动调用 init()
if (typeof window !== "undefined") {
    FocusAnyShim.init();
}
