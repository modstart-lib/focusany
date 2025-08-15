/// <reference path="focusany.d.ts" />

const FocusAnyShim = {
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
            showNotification(body: string, clickActionName?: string): void {
                focusanySupport?.showToast(body, {
                    duration: 5000,
                    status: "info",
                });
            },
            showToast(body: string, options?: {duration?: number; status?: "info" | "success" | "error"}): void {
                const duration =
                    typeof options?.duration === "number" && options.duration >= 0 ? options.duration : 3000;
                const status = ["info", "success", "error"].includes(options?.status as string) ? options.status : "info";

                // 创建SVG图标函数
                const createSvgIcon = (type: string): string => {
                    const svgBase =
                        'xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"';

                    switch (type) {
                        case "info":
                            return `<svg ${svgBase}><circle cx="8" cy="8" r="7" fill="rgba(255,255,255,0.15)" stroke="currentColor" stroke-width="1"/><path d="M8 4a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3A.5.5 0 0 1 8 4zM8 11a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/></svg>`;
                        case "success":
                            return `<svg ${svgBase}><circle cx="8" cy="8" r="7" fill="rgba(255,255,255,0.15)" stroke="currentColor" stroke-width="1"/><path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z"/></svg>`;
                        case "error":
                            return `<svg ${svgBase}><circle cx="8" cy="8" r="7" fill="rgba(255,255,255,0.15)" stroke="currentColor" stroke-width="1"/><path d="M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>`;
                        default:
                            return `<svg ${svgBase}><circle cx="8" cy="8" r="6" fill="rgba(255,255,255,0.15)"/></svg>`;
                    }
                };

                const statusStyles = {
                    info: {background: "#1890ff", color: "#ffffff", icon: createSvgIcon("info")},
                    success: {background: "#52c41a", color: "#ffffff", icon: createSvgIcon("success")},
                    error: {background: "#ff4d4f", color: "#ffffff", icon: createSvgIcon("error")},
                };
                const currentStyle = statusStyles[status];

                let container = document.getElementById("focusany-shim-toast-container");
                if (!container) {
                    container = document.createElement("div");
                    container.id = "focusany-shim-toast-container";
                    container.style.cssText = `
                        position: fixed !important;
                        top: 20px !important;
                        right: 20px !important;
                        z-index: 999999 !important;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                        pointer-events: none !important;
                        max-width: 350px !important;
                        width: auto !important;
                    `;
                    document.body.appendChild(container);
                }

                // 创建通知元素
                const notification = document.createElement("div");
                notification.style.cssText = `
                    background: ${currentStyle.background} !important;
                    color: ${currentStyle.color} !important;
                    padding: 12px 30px 12px 16px !important;
                    margin-bottom: 10px !important;
                    border-radius: 6px !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
                    font-size: 14px !important;
                    line-height: 1.4 !important;
                    width: 100% !important;
                    max-width: 320px !important;
                    word-wrap: break-word !important;
                    opacity: 0 !important;
                    transform: translateX(350px) !important;
                    transition: all 0.3s ease !important;
                    pointer-events: auto !important;
                    cursor:default !important;
                    border: none !important;
                    outline: none !important;
                    text-decoration: none !important;
                    box-sizing: border-box !important;
                    display: block !important;
                    position: relative !important;
                    min-height: 20px !important;
                `;

                // 创建内容容器
                const content = document.createElement("div");
                content.style.cssText = `
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                `;

                // 添加状态图标
                const iconSpan = document.createElement("span");
                iconSpan.innerHTML = currentStyle.icon;
                iconSpan.style.cssText = `
                    font-size: 16px !important;
                    line-height: 1 !important;
                    flex-shrink: 0 !important;
                    padding: 4px 6px !important;
                    border-radius: 4px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                `;

                // 添加文本内容
                const textSpan = document.createElement("span");
                textSpan.textContent = body;
                textSpan.style.cssText = `
                    flex: 1 !important;
                `;

                content.appendChild(iconSpan);
                content.appendChild(textSpan);
                notification.appendChild(content);
                const closeButton = document.createElement("span");
                closeButton.textContent = "×";
                closeButton.style.cssText = `
                    position: absolute !important;
                    top: 50% !important;
                    right: 8px !important;
                    transform: translateY(-50%) !important;
                    font-size: 16px !important;
                    font-weight: bold !important;
                    cursor: pointer !important;
                    color: rgba(255, 255, 255, 0.8) !important;
                    line-height: 1 !important;
                    width: 20px !important;
                    height: 20px !important;
                    text-align: center !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    border-radius: 50% !important;
                    background: rgba(255, 255, 255, 0.1) !important;
                    transition: all 0.2s ease !important;
                    backdrop-filter: blur(4px) !important;
                `;
                closeButton.addEventListener("mouseenter", () => {
                    closeButton.style.color = "#ffffff !important";
                    closeButton.style.backgroundColor = "rgba(255, 255, 255, 0.2) !important";
                    closeButton.style.transform = "translateY(-50%) scale(1.1) !important";
                });
                closeButton.addEventListener("mouseleave", () => {
                    closeButton.style.color = "rgba(255, 255, 255, 0.8) !important";
                    closeButton.style.backgroundColor = "rgba(255, 255, 255, 0.1) !important";
                    closeButton.style.transform = "translateY(-50%) scale(1) !important";
                });
                closeButton.addEventListener("click", e => {
                    e.stopPropagation();
                    removeNotification();
                });
                notification.appendChild(closeButton);
                container.appendChild(notification);
                setTimeout(() => {
                    notification.style.setProperty("opacity", "1", "important");
                    notification.style.setProperty("transform", "translateX(0)", "important");
                }, 10);
                const removeNotification = () => {
                    notification.style.setProperty("opacity", "0", "important");
                    notification.style.setProperty("transform", "translateX(350px)", "important");
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                        // 如果容器为空，移除容器
                        if (container && container.children.length === 0) {
                            if (container.parentNode) {
                                container.parentNode.removeChild(container);
                            }
                        }
                    }, 300);
                };

                // 使用配置的 duration 时间自动移除
                if (duration > 0) {
                    setTimeout(removeNotification, duration);
                }
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
