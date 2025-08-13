import {
    ActionMatchFile,
    ActionMatchKey,
    ActionMatchRegex,
    ActionMatchText,
    ActionMatchTypeEnum,
    ActionMatchWindow,
    ActionRecord,
    ActionTypeEnum,
    ActiveWindow,
    PluginRecord,
    SelectedContent,
} from "../../../src/types/Manager";
import {ManagerSystem} from "./system";
import {ManagerPlugin} from "./plugin";
import {ManagerConfig} from "./config/config";
import {SearchQuery} from "./type";
import {PinyinUtil} from "../../lib/pinyin-util";
import {exec} from "child_process";
import {ManagerWindow} from "./window";
import {ManagerCode} from "./code";
import {ManagerBackend} from "./backend";
import {ReUtil, StrUtil} from "../../lib/util";
import {Events} from "../event/main";
import {ManagerEditor} from "./editor";
import {cloneDeep} from "lodash";

type SearchRequest = {
    id: string;
    query: SearchQuery;
};

let plugins: PluginRecord[] = [];

export const Manager = {
    selectedContent: null as SelectedContent | null,
    activeWindow: null as ActiveWindow | null,
    searchRequests: [] as SearchRequest[],
    createSearchRequest(query: SearchQuery) {
        const id = StrUtil.randomString(8);
        if (this.searchRequests.length > 3) {
            this.searchRequests.shift();
        }
        const request = {
            id,
            query,
        };
        this.searchRequests.push(request);
        return request;
    },
    getSearchRequestQuery(id: string) {
        for (const s of this.searchRequests) {
            if (s.id === id) {
                return s.query;
            }
        }
        return null;
    },
    async openPlugin(pluginName: string) {
        const plugin = await this.getPlugin(pluginName);
        if (!plugin) {
            throw "PluginNotExists";
        }
        if (!plugin.actions || !plugin.actions.length) {
            throw "PluginNoActions";
        }
        for (const a of plugin.actions) {
            if (a.type === ActionTypeEnum.WEB) {
                await this.openAction(a);
                return;
            }
        }
    },
    async openActionForWindow(type: "open" | "close", action: ActionRecord) {
        await ManagerWindow.detachWindowOperate(type, action);
    },
    async openAction(action: ActionRecord) {
        const plugin = await Manager.getPlugin(action.pluginName);
        if (!plugin) {
            return;
        }
        if (!action.runtime) {
            action.runtime = {
                searchScore: 0,
                searchTitleMatched: "",
                match: null,
            };
        }
        switch (action.type) {
            case ActionTypeEnum.COMMAND:
                exec(action.data.command);
                break;
            case ActionTypeEnum.WEB:
                await ManagerWindow.open(plugin, action);
                break;
            case ActionTypeEnum.CODE:
                ManagerCode.execute(plugin, action).then();
                break;
            case ActionTypeEnum.BACKEND:
                ManagerBackend.runAction(plugin, action).then();
                break;
        }
        if (action.trackHistory) {
            await this.addHistoryAction(plugin, action);
        }
    },
    async getPlugin(name: string) {
        for (let p of await this.listPlugin()) {
            if (p.name === name) {
                return p;
            }
        }
        return null;
    },
    getPluginSync(name: string) {
        for (let p of plugins) {
            if (p.name === name) {
                return p;
            }
        }
        return null;
    },
    async listPlugin() {
        plugins = [...(await ManagerSystem.list()), ...(await ManagerPlugin.list())];
        const customActions = await ManagerConfig.getCustomAction();
        for (const p of plugins) {
            if (!(p.name in customActions)) {
                continue;
            }
            p.actions = p.actions.concat(customActions[p.name]);
        }
        return plugins;
    },
    async listAction(request?: SearchRequest) {
        let actions: ActionRecord[] = [...(await ManagerSystem.listAction()), ...(await ManagerPlugin.listAction())];
        const customActions = await ManagerConfig.getCustomAction();
        for (const customAction of Object.values(customActions)) {
            actions = actions.concat(customAction);
        }
        for (let a of actions) {
            a.runtime = {
                searchScore: 0,
                searchTitleMatched: "",
                match: null,
                requestId: request ? request.id : null,
            };
        }
        return actions;
    },
    async searchOneAction(keywordsOrAction: string | string[], query: SearchQuery) {
        const request = this.createSearchRequest(query);
        query = Object.assign(
            {
                keywords: "",
                currentFiles: [],
                currentImage: "",
                currentText: "",
            },
            query
        );
        const actions = await this.listAction(request);
        let action: ActionRecord = null;
        if (typeof keywordsOrAction === "string") {
            const uniqueRemover = new Set<string>();
            const results = await this.searchActions(uniqueRemover, actions, {
                ...query,
                keywords: keywordsOrAction,
            });
            if (results.length > 0) {
                action = results[0];
            }
        } else {
            const fullName = keywordsOrAction.join("/");
            for (let a of actions) {
                if (a.fullName === fullName) {
                    action = a;
                    break;
                }
            }
        }
        return action;
    },
    async matchActionSimple(query: SearchQuery): Promise<ActionRecord[]> {
        const request = this.createSearchRequest(query);
        query = Object.assign(
            {
                keywords: "",
                currentFiles: [],
                currentImage: "",
                currentText: "",
                activeWindow: this.activeWindow,
            },
            query
        );
        const actions = await this.listAction(request);
        const uniqueRemover = new Set<string>();
        return await this.matchActions(uniqueRemover, actions, query);
    },
    async searchActions(
        uniqueRemover: Set<string>,
        actions: ActionRecord[],
        query: SearchQuery
    ): Promise<ActionRecord[]> {
        let results = [];
        if (!query.keywords) {
            return results;
        }
        for (const a of actions) {
            if (!a.matches || uniqueRemover.has(a.fullName)) {
                continue;
            }
            let searchScoreMax = 0;
            let runtimeSearchTitleMatched = "";
            let runtimeMatch = null;
            for (const m of a.matches) {
                if (m.type === ActionMatchTypeEnum.TEXT) {
                    if ("minLength" in m && query.keywords.length < m.minLength) {
                        continue;
                    }
                    if ("maxLength" in m && query.keywords.length > m.maxLength) {
                        continue;
                    }
                    const textMatch = PinyinUtil.match((m as ActionMatchText).text, query.keywords);
                    if (textMatch.matched && textMatch.similarity > searchScoreMax) {
                        searchScoreMax = textMatch.similarity;
                        runtimeSearchTitleMatched = textMatch.inputMark;
                        runtimeMatch = m;
                    }
                } else if (m.type === ActionMatchTypeEnum.KEY) {
                    if ((m as ActionMatchKey).key === query.keywords) {
                        searchScoreMax = 1;
                        runtimeSearchTitleMatched = PinyinUtil.mark(query.keywords);
                        runtimeMatch = m;
                    }
                }
            }
            // console.log('searchScoreMax', a.name, searchScoreMax, a.runtime.searchScore > 0)
            if (searchScoreMax > 0) {
                a.runtime.searchScore = searchScoreMax;
                a.runtime.searchTitleMatched = runtimeSearchTitleMatched;
                a.runtime.match = runtimeMatch;
                results.push(a);
                uniqueRemover.add(a.fullName);
            }
        }
        // sort by similarity
        results = results.sort((a, b) => {
            return b.runtime.searchScore - a.runtime.searchScore;
        });
        return results;
    },
    async matchActions(
        uniqueRemover: Set<string>,
        actions: ActionRecord[],
        query: SearchQuery
    ): Promise<ActionRecord[]> {
        let results = [];
        if (
            !query.keywords &&
            !query.currentImage &&
            !query.currentFiles.length &&
            !query.currentText &&
            !query.activeWindow
        ) {
            return results;
        }
        const keywords = query.currentText || query.keywords;
        for (const a of actions) {
            if (!a.matches || uniqueRemover.has(a.fullName)) {
                continue;
            }
            let searchScoreMax = 0;
            let runtimeSearchTitleMatched = "";
            let runtimeMatch = null;
            let matchFiles = [];
            for (const m of a.matches) {
                if (m.type === ActionMatchTypeEnum.REGEX) {
                    if (!keywords) {
                        continue;
                    }
                    if ("minLength" in m && keywords.length < m.minLength) {
                        continue;
                    }
                    if ("maxLength" in m && keywords.length > m.maxLength) {
                        continue;
                    }
                    if (ReUtil.match((m as ActionMatchRegex).regex, keywords)) {
                        searchScoreMax = 1;
                        runtimeSearchTitleMatched = (m as ActionMatchRegex).title || a.title;
                        runtimeMatch = m;
                        break;
                    }
                } else if (m.type === ActionMatchTypeEnum.FILE) {
                    let files = query.currentFiles;
                    if (files.length <= 0) {
                        continue;
                    }
                    // console.log('file', JSON.stringify({m, files}, null, 2))
                    if ("filterFileType" in m) {
                        if (m.filterFileType === "file") {
                            files = files.filter(f => f.isFile);
                        } else if (m.filterFileType === "directory") {
                            files = files.filter(f => f.isDirectory);
                        }
                    }
                    if ("filterExtensions" in m) {
                        files = files.filter(
                            f => f.isFile && (m as ActionMatchFile).filterExtensions.includes(f.fileExt)
                        );
                    }
                    if ("minCount" in m && files.length < m.minCount) {
                        continue;
                    }
                    if ("maxCount" in m && files.length > m.maxCount) {
                        continue;
                    }
                    if (files.length <= 0) {
                        continue;
                    }
                    searchScoreMax = 1;
                    runtimeSearchTitleMatched = (m as ActionMatchFile).title || a.title;
                    runtimeMatch = m;
                    matchFiles = files;
                    break;
                } else if (m.type === ActionMatchTypeEnum.IMAGE) {
                    const image = query.currentImage;
                    if (!image) {
                        continue;
                    }
                    searchScoreMax = 1;
                    runtimeSearchTitleMatched = (m as ActionMatchFile).title || a.title;
                    runtimeMatch = m;
                } else if (m.type === ActionMatchTypeEnum.WINDOW) {
                    const activeWindow = query.activeWindow;
                    if (!activeWindow) {
                        continue;
                    }
                    if (
                        (m as ActionMatchWindow).nameRegex &&
                        !ReUtil.match((m as ActionMatchWindow).nameRegex, activeWindow.name)
                    ) {
                        continue;
                    }
                    if (
                        (m as ActionMatchWindow).titleRegex &&
                        !ReUtil.match((m as ActionMatchWindow).titleRegex, activeWindow.title)
                    ) {
                        continue;
                    }
                    if ((m as ActionMatchWindow).attrRegex) {
                        let pass = true;
                        for (const key in (m as ActionMatchWindow).attrRegex) {
                            if (!ReUtil.match((m as ActionMatchWindow).attrRegex[key], activeWindow.attr[key])) {
                                pass = false;
                                break;
                            }
                        }
                        if (!pass) {
                            continue;
                        }
                    }
                    searchScoreMax = 1;
                    runtimeSearchTitleMatched = a.title;
                    runtimeMatch = m;
                    break;
                } else if (m.type === ActionMatchTypeEnum.EDITOR) {
                    let files = query.currentFiles;
                    if (files.length <= 0) {
                        continue;
                    }
                    // console.log('file', JSON.stringify({m, files}, null, 2))
                    if ("extensions" in m) {
                        files = files.filter(f => f.isFile && (m as ActionMatchEditor).extensions.includes(f.fileExt));
                    }
                    if ("fadTypes" in m) {
                        files = await ManagerEditor.filterFadType(files, (m as ActionMatchEditor).fadTypes);
                    }
                    if (files.length <= 0) {
                        continue;
                    }
                    searchScoreMax = 1;
                    runtimeSearchTitleMatched = a.title;
                    runtimeMatch = m;
                    matchFiles = files;
                    break;
                }
            }
            // console.log('searchScoreMax', a.name, searchScoreMax, a.runtime.searchScore > 0)
            if (searchScoreMax > 0) {
                a.runtime.searchScore = searchScoreMax;
                a.runtime.searchTitleMatched = runtimeSearchTitleMatched;
                a.runtime.match = runtimeMatch;
                a.runtime.matchFiles = matchFiles;
                results.push(a);
                uniqueRemover.add(a.fullName);
            }
        }
        // sort by similarity
        results = results.sort((a, b) => {
            return b.runtime.searchScore - a.runtime.searchScore;
        });
        return results;
    },
    async detachWindowActions(uniqueRemover: Set<string>, actionFullNameMap: Map<string, ActionRecord>) {
        const results = [];
        const pluginCount = {};
        for (const win of ManagerWindow.listDetachWindows()) {
            let actionWeb = null;
            for (const a of win._plugin.actions) {
                if (a.type === ActionTypeEnum.WEB) {
                    actionWeb = a;
                    break;
                }
            }
            if (!actionWeb) {
                continue;
            }
            const fullName = actionWeb.pluginName + "/" + actionWeb.name;
            if (actionFullNameMap.has(fullName)) {
                const action = actionFullNameMap.get(fullName);
                const actionClone = cloneDeep(action);
                actionClone.runtime.windowId = win.id;
                if (pluginCount[actionWeb.pluginName]) {
                    pluginCount[actionWeb.pluginName]++;
                } else {
                    pluginCount[actionWeb.pluginName] = 1;
                }
                actionClone.runtime.windowIndex = pluginCount[actionWeb.pluginName];
                results.push(actionClone);
                uniqueRemover.add(fullName);
            }
        }
        for (const r of results) {
            r.runtime.windowCount = results.filter(a => a.pluginName === r.pluginName).length;
        }
        return results;
    },
    async historyActions(uniqueRemover: Set<string>, actionFullNameMap: Map<string, ActionRecord>, query: SearchQuery) {
        const historyActions = await ManagerConfig.getHistoryAction();
        const results = [];
        for (const h of historyActions) {
            const fullName = h.pluginName + "/" + h.actionName;
            if (uniqueRemover.has(fullName)) {
                continue;
            }
            if (actionFullNameMap.has(fullName)) {
                results.push(actionFullNameMap.get(fullName));
                uniqueRemover.add(fullName);
            }
        }
        return results;
    },
    async pinActions(uniqueRemover: Set<string>, actionFullNameMap: Map<string, ActionRecord>, query: SearchQuery) {
        const pinActions = await ManagerConfig.listPinAction();
        const results: ActionRecord[] = [];
        for (const p of pinActions) {
            const fullName = p.pluginName + "/" + p.actionName;
            if (uniqueRemover.has(fullName)) {
                continue;
            }
            if (actionFullNameMap.has(fullName)) {
                results.push(actionFullNameMap.get(fullName));
                uniqueRemover.add(fullName);
            }
        }
        return results;
    },
    async sendBroadcast(pluginName: string, type: string, data: any) {
        for (const view of ManagerWindow.listBrowserViews()) {
            if (view._plugin && view._plugin.name === pluginName) {
                Events.sendRaw(view.webContents, "BROADCAST", {
                    type,
                    data,
                });
            }
        }
    },
    async setNotice(
        notice:
            | {
            text: string;
            type?: "info" | "error" | "success";
            duration?: number;
        }
            | string
    ) {
        if (typeof notice === "string") {
            notice = {text: notice};
        }
        notice = Object.assign(
            {
                text: "",
                type: "info",
                duration: 0,
            },
            notice
        );
        Events.broadcast("Notice", notice, {
            limit: true,
            scopes: ["main"],
        });
    },
};
