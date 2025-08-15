import {
    ActionMatch,
    ActionMatchKey,
    ActionMatchRegex,
    ActionMatchText,
    ActionMatchTypeEnum,
    ActionRecord,
    ActionTypeEnum,
    PluginEnv,
    PluginRecord,
    PluginType,
} from "../../../../src/types/Manager";
import {Files} from "../../file/main";
import {preloadDefault, preloadPluginDefault, rendererDistPath, rendererIsUrl} from "../../../lib/env-main";
import {join} from "node:path";
import {KVDBMain} from "../../kvdb/main";
import {CommonConfig} from "../../../config/common";
import {MemoryCacheUtil, StrUtil, UIUtil, VersionUtil} from "../../../lib/util";
import {MiscMain} from "../../misc/main";
import {platformName} from "../../../lib/env";
import {AppConfig} from "../../../../src/config";
import {WindowConfig} from "../../../config/window";
import {AppsMain} from "../../app/main";
import {ManagerConfig} from "../config/config";
import {ManagerBackend} from "../backend";
import {session} from "electron";
import {PluginHttp} from "./http";

type PluginInfo = {
    type: PluginType;
    name: string;
    version: string;
    root: string;
    config: PluginRecord;
};

export const ManagerPlugin = {
    installingMap: {} as {
        [name: string]: {
            version: string;
            startTime: number;
        };
    },
    async clearCache() {
        MemoryCacheUtil.forget("Plugins");
        MemoryCacheUtil.forget("PluginActions");
    },
    async getInfo(plugin: PluginRecord) {
        // nodeIntegration
        let nodeIntegration = false;
        if (plugin.type === PluginType.SYSTEM) {
            nodeIntegration = true;
        } else if (plugin.setting && plugin.setting.nodeIntegration) {
            nodeIntegration = true;
        }
        // preloadBase
        let preloadBase = preloadPluginDefault;
        if (plugin.setting && plugin.setting.preloadBase) {
            preloadBase = plugin.setting.preloadBase;
            if (preloadBase === "<system>") {
                preloadBase = preloadDefault;
            }
        }
        // preload
        let preload = plugin.preload || null;
        if (preload) {
            if (preload === "<system>") {
                preload = preloadDefault;
            } else {
                preload = join(plugin.runtime?.root, preload);
            }
        }
        if (preload && preloadBase === preload) {
            preload = null;
        }
        // main && mainView
        let main = plugin.main || null;
        if (main && plugin.setting?.httpEntry) {
            main = await PluginHttp.url(plugin.name, main);
        }
        if (!main) {
            main = rendererDistPath("static/pluginEmpty.html");
        }
        let mainView = plugin.mainView || null;
        if (!mainView) {
            mainView = main;
        }
        if (mainView && plugin.setting?.httpEntry) {
            mainView = await PluginHttp.url(plugin.name, mainView);
        }
        if (plugin.runtime?.root) {
            if (!rendererIsUrl(main)) {
                main = join(plugin.runtime?.root, main);
            }
        } else if (main.includes("<root>")) {
            main = main.replace("<root>/", "");
            main = rendererDistPath(main);
        }
        if (plugin.runtime?.root) {
            if (!rendererIsUrl(mainView)) {
                mainView = join(plugin.runtime?.root, mainView);
            }
        } else if (mainView.includes("<root>")) {
            mainView = mainView.replace("<root>/", "");
            mainView = rendererDistPath(mainView);
        }
        if (!rendererIsUrl(mainView)) {
            mainView = `file://${mainView}`;
        }

        // auto detach
        let autoDetach = false;
        if (plugin.setting && plugin.setting.autoDetach) {
            autoDetach = true;
        }
        if (!autoDetach && plugin.runtime.config && plugin.runtime.config.autoDetach) {
            autoDetach = true;
        }
        // width & height
        let width = WindowConfig.pluginWidth;
        let height = WindowConfig.pluginHeight;
        if (plugin.setting) {
            const display = AppsMain.getCurrentScreenDisplay();
            if (plugin.setting.width) {
                width = UIUtil.sizeToPx(plugin.setting.width + "", display.workArea.width);
                autoDetach = true;
            }
            if (plugin.setting.height) {
                height = UIUtil.sizeToPx(plugin.setting.height + "", display.workArea.height);
                autoDetach = true;
            }
        }
        // singleton
        let singleton = true;
        if (plugin.setting && "singleton" in plugin.setting) {
            singleton = false;
        }
        // zoom
        let zoom = 100;
        if (plugin.setting && plugin.setting.zoom) {
            zoom = plugin.setting.zoom;
        }
        if (plugin.runtime.config && plugin.runtime.config.zoom) {
            zoom = plugin.runtime.config.zoom;
        }
        return {
            nodeIntegration,
            preloadBase,
            preload,
            main,
            mainView,
            width,
            height,
            autoDetach,
            singleton,
            zoom,
        };
    },
    normalAction(action: ActionRecord, plugin: PluginRecord) {
        const matches: ActionMatch[] = [];
        for (let m of action.matches) {
            if (typeof m === "string") {
                m = {
                    type: ActionMatchTypeEnum.TEXT,
                    text: m,
                } as any;
            }
            if (!m.name) {
                switch (m.type) {
                    case ActionMatchTypeEnum.TEXT:
                        m.name = (m as ActionMatchText).text;
                        break;
                    case ActionMatchTypeEnum.KEY:
                        m.name = (m as ActionMatchKey).key;
                        break;
                    case ActionMatchTypeEnum.REGEX:
                        m.name = (m as ActionMatchRegex).regex;
                        break;
                    case ActionMatchTypeEnum.FILE:
                    case ActionMatchTypeEnum.IMAGE:
                    case ActionMatchTypeEnum.WINDOW:
                        m.name = StrUtil.hashCode(JSON.stringify(m));
                        break;
                }
            }
            matches.push(m);
        }
        if (!('trackHistory' in action)) {
            action.trackHistory = true;
        }
        const normalAction = {
            fullName: `${plugin.name}/${action.name}`,
            pluginName: plugin.name,
            name: action.name,
            title: action.title || plugin.title,
            icon: action.icon || plugin.logo,
            trackHistory: action.trackHistory,
            type: action.type || ActionTypeEnum.WEB,
            pluginType: plugin.type,
            matches: matches,
            data: action.data || {},
            platform: action.platform || ["win", "osx", "linux"],
        } as ActionRecord;
        if (plugin.runtime.root) {
            if (normalAction.icon && !normalAction.icon.startsWith("file://")) {
                normalAction.icon = `file://${plugin.runtime.root}/${normalAction.icon}`;
            }
        }
        return normalAction;
    },
    async initIfNeed(
        plugin: PluginRecord,
        option: {
            type: PluginType;
            root?: string;
            configJson?: any;
        }
    ) {
        option = Object.assign(
            {
                type: null,
            },
            option
        );

        if (!option.type) {
            throw "PluginTypeError";
        }

        // console.log('ManagerPlugin.init', plugin.name, !plugin.runtime)

        if (plugin.runtime) {
            return plugin;
        }

        plugin.platform = plugin.platform || ["win", "osx", "linux"];
        plugin.versionRequire = plugin.versionRequire || "*";
        plugin.editionRequire = plugin.editionRequire || ["open", "pro"];

        plugin.logo = plugin.logo || null;
        plugin.main = plugin.main || null;
        plugin.mainView = plugin.mainView || plugin.main;
        plugin.preload = plugin.preload || null;
        plugin.author = plugin.author || null;
        plugin.homepage = plugin.homepage || null;

        plugin.setting = Object.assign(
            {
                remoteWebCacheEnable: false,
                httpEntry: false,
                moreMenu: [],
            },
            plugin.setting || {}
        );

        plugin.development = Object.assign(
            {
                keepCodeDevTools: false,
            },
            plugin.development
        );

        plugin.type = option.type;
        plugin.env = PluginEnv.PROD;

        plugin.runtime = {
            root: option.root,
            config: await ManagerConfig.getPluginConfig(plugin.name),
        };

        if (plugin.runtime.root) {
            if (plugin.logo && !plugin.logo.startsWith("file://")) {
                plugin.logo = `file://${plugin.runtime.root}/${plugin.logo}`;
            }
        }

        for (let aIndex = 0; aIndex < plugin.actions.length; aIndex++) {
            const a = this.normalAction(plugin.actions[aIndex], plugin);
            if (!a.platform.includes(platformName())) {
                continue;
            }
            plugin.actions[aIndex] = a;
        }

        const configJson = option.configJson || null;
        if (configJson) {
            if (configJson["development"]) {
                plugin.env = PluginEnv.DEV;
                if (configJson["development"].env) {
                    plugin.env = configJson["development"].env as any;
                }
                if (PluginEnv.DEV === plugin.env) {
                    if (configJson["development"].main) {
                        plugin.main = configJson["development"].main;
                    }
                    if (configJson["development"].mainView) {
                        plugin.mainView = configJson["development"].mainView;
                    }
                }
            }
        }

        return plugin;
    },
    async configCheck(config: any) {
        if (!config) {
            throw `PluginFormatError:-1`;
        }
        if (!config.name || !config.version) {
            throw `PluginFormatError:-2`;
        }
        const existsP = await this.get(config.name);
        if (existsP) {
            throw `PluginAlreadyExists : ${config.name}`;
        }
        if (!config.platform) {
            config.platform = ["win", "osx", "linux"];
        }
        if (!config.platform.includes(platformName())) {
            throw `PluginNotSupportPlatform : ${config.name}`;
        }
        if (!config.versionRequire) {
            config.versionRequire = "*";
        }
        if (!VersionUtil.match(AppConfig.version, config.versionRequire)) {
            throw `PluginVersionNotMatch:-2:${config.name}`;
        }
        if (!config.editionRequire) {
            config.editionRequire = ["open", "pro"];
        }
        if (!config.editionRequire.includes("open")) {
            throw `PluginEditionNotMatch:-1:${config.name}`;
        }
    },
    async parsePackage(file: string, option?: {}) {
        option = Object.assign({}, option);
        if (!file.endsWith(".zip")) {
            throw `PluginFormatError:-3`;
        }
        let config = null;
        try {
            config = await MiscMain.getZipFileContent(file, "config.json");
        } catch (e) {
            throw `PluginFormatError:-4`;
        }
        if (!config) {
            throw `PluginFormatError:-5`;
        }
        try {
            config = JSON.parse(config as string);
        } catch (e) {
            throw `PluginFormatError:-6`;
        }
        if (!config) {
            throw `PluginFormatError:-7`;
        }
        if (!config.name || !config.version) {
            throw `PluginFormatError:-8`;
        }
        const target = await Files.fullPath(`plugin/${config.name}`);
        return {
            name: config.name,
            version: config.version,
            target,
        };
    },
    async installFromFileOrDir(fileOrPath: string, type?: PluginType) {
        let guessType = type || PluginType.DIR;
        if (
            !(await Files.isDirectory(fileOrPath, {
                isFullPath: true,
            }))
        ) {
            if (fileOrPath.endsWith("config.json")) {
                fileOrPath = fileOrPath.replace(/[\/\\]config.json$/, "");
            } else {
                guessType = PluginType.ZIP;
                const {name, version, target} = await this.parsePackage(fileOrPath);
                const plugin = await ManagerPlugin.get(name);
                if (
                    await Files.exists(target, {
                        isFullPath: true,
                    })
                ) {
                    if (!plugin) {
                        await Files.deletes(target, {
                            isFullPath: true,
                        });
                    }
                }
                try {
                    await MiscMain.unzip(fileOrPath, target);
                    fileOrPath = target;
                } catch (e) {
                    throw "PluginInstallError";
                }
            }
        }
        return await this.install(fileOrPath, type || guessType);
    },
    async install(root: string, type: PluginType) {
        const p = await this._readPluginInfo(root);
        if (!p) {
            throw `PluginNotValid : ${root}`;
        }
        const existsP = await this.get(p.name);
        if (existsP) {
            throw `PluginAlreadyExists : ${p.name}`;
        }
        const plugin = await this.initIfNeed(p, {
            type,
            root,
            configJson: p,
        });
        if (!plugin.platform.includes(platformName())) {
            throw `PluginNotSupportPlatform : ${plugin.name}`;
        }
        if (!VersionUtil.match(AppConfig.version, plugin.versionRequire)) {
            throw `PluginVersionNotMatch:-1:${plugin.name}`;
        }
        if (!plugin.editionRequire.includes("open")) {
            throw `PluginEditionNotMatch:-2:${plugin.name}`;
        }
        const runtime = plugin.runtime;
        delete plugin.runtime;
        const info: PluginInfo = {
            type,
            version: plugin.version,
            name: plugin.name,
            root,
            config: plugin,
        };
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: `${CommonConfig.dbPluginIdPrefix}/${info.name}`,
            ...info,
        });
        await this.clearCache();
        setTimeout(async () => {
            plugin.runtime = runtime;
            await ManagerBackend.run(plugin, "hook", "installed", {});
        }, 1000);
    },
    async refreshInstall(name: string) {
        const doc = await KVDBMain.get(CommonConfig.dbSystem, `${CommonConfig.dbPluginIdPrefix}/${name}`);
        if (!doc) {
            throw `PluginNotExists : ${name}`;
        }
        const pluginInfo: PluginInfo = doc as any;
        const root = pluginInfo.root;
        const p = await this._readPluginInfo(root);
        // console.log('refreshInstall', JSON.stringify({name, root, p}, null, 2))
        if (!p) {
            throw `PluginNotValid : ${root}`;
        }
        const plugin = await this.initIfNeed(p, {
            type: pluginInfo.type,
            root,
            configJson: p,
        });
        delete plugin.runtime;
        const info: PluginInfo = {
            type: pluginInfo.type,
            version: plugin.version,
            name: plugin.name,
            root,
            config: plugin,
        };
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: `${CommonConfig.dbPluginIdPrefix}/${info.name}`,
            ...info,
        });
        await this.clearCache();
        setTimeout(async () => {
            await ManagerBackend.run(plugin, "hook", "installed", {});
        }, 1000);
    },
    async uninstall(name: string) {
        const plugin = await this.get(name);
        if (!plugin) {
            throw `PluginNotExists:-1:${name}`;
        }
        const pi = await KVDBMain.get(CommonConfig.dbSystem, `${CommonConfig.dbPluginIdPrefix}/${name}`);
        if (!pi) {
            throw `PluginNotExists:-2:${name}`;
        }
        const info: PluginInfo = pi as any;
        if (!info.name || !info.version || !info.type || !info.config) {
            throw `PluginNotExists:-3:${name}`;
        }
        await ManagerBackend.run(plugin, "hook", "beforeUninstall", {});
        if (info.type === PluginType.STORE || info.type === PluginType.ZIP) {
            if (info.root) {
                await Files.deletes(info.root, {
                    isFullPath: true,
                });
            }
        }
        await KVDBMain.remove(CommonConfig.dbSystem, pi);
        await ManagerConfig.clearCustomAction(name);
        await this.clearCache();
        await this.clearViewSession(plugin);
    },
    async getPluginInstalledVersion(name: string) {
        const plugin = await this.get(name);
        if (!plugin) {
            return null;
        }
        return plugin.version;
    },
    async isPluginInstalling(name: string) {

    },
    async list() {
        const plugins = await MemoryCacheUtil.remember("Plugins", async () => {
            // await this.install(`${process.cwd()}/plugin-examples/plugin-example`, 'system')
            let plugins: PluginRecord[] = [];
            const pluginInfos = await KVDBMain.allDocs(CommonConfig.dbSystem, `${CommonConfig.dbPluginIdPrefix}/`);
            for (const pi of pluginInfos) {
                const info: PluginInfo = pi as any;
                if (!info.name || !info.version || !info.type || !info.config) {
                    await KVDBMain.remove(CommonConfig.dbSystem, pi);
                    continue;
                }
                let configJson = null;
                if (info.type === PluginType.DIR) {
                    configJson = await this._readPluginInfo(info.root);
                    info.config = configJson;
                    if (!info.config) {
                        // 本地插件可能已经被删除
                        await KVDBMain.remove(CommonConfig.dbSystem, pi);
                        continue;
                    }
                }
                plugins.push(
                    await this.initIfNeed(info.config, {
                        type: info.type,
                        root: info.root,
                        configJson,
                    })
                );
            }
            // console.log('plugins', JSON.stringify(plugins))
            return plugins;
        });
        // 有开发选项并且是开发环境的插件，每次都重新读取 config
        for (let pIndex = 0; pIndex < plugins.length; pIndex++) {
            const p = plugins[pIndex];
            if (p.type === PluginType.DIR && p.env === "dev" && p.runtime.root) {
                const configJson = await this._readPluginInfo(p.runtime.root);
                plugins[pIndex] = await this.initIfNeed(p, {
                    type: p.type,
                    root: p.runtime.root,
                    configJson,
                });
            }
        }
        return plugins;
    },
    async get(name: string) {
        for (const p of await this.list()) {
            if (p.name === name) {
                return p;
            }
        }
        return null;
    },
    async _readPluginInfo(root: string) {
        root = root.replace(/[\\/]+$/, "");
        const configPath = root + "/config.json";
        const config = await Files.read(configPath, {
            isFullPath: true,
        });
        if (!config) {
            return null;
        }
        try {
            let configJson = JSON.parse(config);
            if (!configJson) {
                return null;
            }
            return configJson;
        } catch (e) {
        }
        return null;
    },
    async listAction() {
        return await MemoryCacheUtil.remember("PluginActions", async () => {
            let actions: ActionRecord[] = [];
            const plugins = await this.list();
            for (const p of plugins) {
                actions = actions.concat(p.actions);
            }
            return actions;
        });
    },
    async getViewSession(plugin: PluginRecord, name: string = null) {
        if (name) {
            return session.fromPartition("<" + plugin.name + `:${name}>`);
        }
        return session.fromPartition("<" + plugin.name + ">");
    },
    async clearViewSession(plugin: PluginRecord) {
        const viewSession = await this.getViewSession(plugin);
        if (viewSession) {
            await viewSession.clearStorageData();
        }
    },
};
