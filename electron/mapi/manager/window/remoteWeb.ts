import {PluginRecord} from "../../../../src/types/Manager";
import {ManagerPlugin} from "../plugin";
import path from "node:path";
import {Files} from "../../file/main";
import {FileUtil} from "../../../lib/util";
import {PluginLog} from "../plugin/log";

type FileMeta = {
    mimeType: string;
    headers: Record<string, string>;
};

export const RemoteWebManager = {
    create: async (plugin: PluginRecord) => {
        const shouldBlock = (url: string) => {
            if (plugin.runtime.remoteWeb && plugin.runtime.remoteWeb.blocks) {
                for (const block of plugin.runtime.remoteWeb.blocks) {
                    if (block.startsWith("/") && block.endsWith("/")) {
                        const regex = new RegExp(block.slice(1, -1));
                        if (regex.test(url)) {
                            return true;
                        }
                    } else {
                        if (url.includes(block)) {
                            return true;
                        }
                    }
                }
                return false;
            }
        };

        const getFileMeta = async (file: string): Promise<FileMeta> => {
            const defaultMeta: FileMeta = {
                mimeType: "application/octet-stream",
                headers: {},
            };
            const meta = file + ".meta.json";
            if (!(await Files.exists(meta, {isFullPath: true}))) {
                return defaultMeta;
            }
            const content = await Files.read(meta, {isFullPath: true});
            if (!content) {
                return defaultMeta;
            }
            try {
                const json: FileMeta = JSON.parse(content);
                if (json) {
                    return {
                        mimeType: json.mimeType || defaultMeta.mimeType,
                        headers: json.headers || defaultMeta.headers,
                    };
                }
            } catch (e) {
            }
            return defaultMeta;
        };

        const writeFileMeta = async (file: string, meta: FileMeta): Promise<void> => {
            const metaFile = file + ".meta.json";
            const content = JSON.stringify(meta, null, 2);
            await Files.write(metaFile, content, {isFullPath: true});
        };

        const getCacheFile = (url: string, param: any = {}): string | null => {
            if (!plugin.runtime.remoteWeb) {
                return null;
            }
            const root = path.join(plugin.runtime.root, "RemoteWebCache");
            if (plugin.runtime.remoteWeb.urlMap) {
                if (plugin.runtime.remoteWeb.urlMap[url]) {
                    return path.join(root, plugin.runtime.remoteWeb.urlMap[url]);
                }
            }
            if (!plugin.runtime.remoteWeb.types || !plugin.runtime.remoteWeb.domains) {
                return null;
            }
            if (!plugin.runtime.remoteWeb.types.length || !plugin.runtime.remoteWeb.domains.length) {
                return null;
            }
            const urlInfo = new URL(url);
            let ext = Files.ext(urlInfo.pathname);
            if (!ext) {
                return null;
            }
            if (!plugin.runtime.remoteWeb.types.includes(ext)) {
                return null;
            }
            if (!plugin.runtime.remoteWeb.domains.includes(urlInfo.hostname)) {
                return null;
            }
            let f = `${urlInfo.hostname}${urlInfo.pathname}`.replace(/[^a-zA-Z0-9\\/.]/g, "_");
            if (urlInfo.search) {
                f = f + "-" + urlInfo.search.replace(/[^a-zA-Z0-9\\/.]/g, "_") + "." + ext;
            }
            return path.join(root, f);
        };

        const webSession = await ManagerPlugin.getViewSession(plugin, "RemoteWeb");

        if (!webSession.protocol.isProtocolHandled("https")) {
            const requestHandler = async (request): Promise<any> => {
                const url = request.url;
                const file = getCacheFile(url);
                if (file && (await Files.exists(file, {isFullPath: true}))) {
                    const buffer = await Files.readBuffer(file, {isFullPath: true});
                    const fileMeta = await getFileMeta(file);
                    PluginLog.info(plugin.name, "RemoteWeb.Cache.Hit", {
                        url,
                    });
                    return new Response(buffer, {
                        status: 200,
                        headers: {
                            "content-type": fileMeta.mimeType,
                            "focusany-cache": "hit",
                            ...fileMeta.headers,
                        },
                    });
                }
                if (!file && shouldBlock(url)) {
                    PluginLog.info(plugin.name, "RemoteWeb.Cache.Blocked", {url});
                    return new Response(`RemoteWebBlock - ${url}`, {
                        status: 403,
                        headers: {"content-type": "text/plain"},
                    });
                }
                return new Promise((resolve, reject) => {
                    fetch(url, {
                        method: request.method || "GET",
                        headers: {
                            ...request.headers,
                            "User-Agent": plugin.runtime.remoteWeb?.userAgent || "FocusAny RemoteWeb Manager",
                        },
                    })
                        .then(async response => {
                            if (!response.ok) {
                                PluginLog.error(plugin.name, "RemoteWeb.Cache.FetchFailed", {
                                    url,
                                    status: response.status,
                                    statusText: response.statusText,
                                });
                                return resolve(
                                    new Response("Fetch failed: " + url, {
                                        status: response.status,
                                        headers: {"content-type": "text/plain"},
                                    })
                                );
                            }
                            const buffer = await response.arrayBuffer();
                            const mimeType =
                                response.headers.get("content-type") ||
                                FileUtil.getMimeByPath(file, "application/octet-stream");
                            const headers = {};
                            response.headers.forEach((value, key) => {
                                headers[key] = value;
                            });
                            const headerToDelete = ["content-security-policy", "content-encoding"];
                            for (const key of headerToDelete) {
                                if (headers[key]) {
                                    delete headers[key];
                                }
                            }
                            let cacheStatus = "miss";
                            if (file) {
                                await Files.writeBuffer(file, Buffer.from(buffer), {isFullPath: true});
                                await writeFileMeta(file, {mimeType, headers});
                                cacheStatus = "cached";
                            }
                            PluginLog.info(plugin.name, "RemoteWeb.Cache.Write", {
                                url,
                                mimeType,
                                headers,
                                cacheStatus,
                                length: buffer.byteLength,
                            });
                            resolve(
                                new Response(buffer, {
                                    status: 200,
                                    headers: {
                                        "content-type": mimeType,
                                        "focusany-cache": cacheStatus,
                                        ...headers,
                                    },
                                })
                            );
                        })
                        .catch(err => {
                            PluginLog.info(plugin.name, "RemoteWeb.Cache.FetchError", {url, error: err});
                            resolve(
                                new Response("Fetch error: " + url + ", " + err.message, {
                                    status: 500,
                                    headers: {"content-type": "text/plain"},
                                })
                            );
                        });
                });
            };
            webSession.protocol.handle("https", requestHandler);
            webSession.protocol.handle("http", requestHandler);
        }
    },
};
