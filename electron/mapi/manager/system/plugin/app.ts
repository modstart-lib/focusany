import {
    ActionMatch,
    ActionMatchTypeEnum,
    ActionRecord,
    ActionTypeEnum,
    PluginRecord
} from "../../../../../src/types/Manager";
import {isLinux, isMac, isWin} from "../../../../lib/env";
import {ManagerAppMac} from "./app/mac";
import {MemoryCacheUtil} from "../../../../lib/util";
import {AppRecord} from "./app/type";
import {SystemIcons} from "../asset/icon";
import {ManagerAppWin} from "./app/win";
import {ManagerAppLinux} from "./app/linux";
import {ManagerSystem} from "../index";
import {ManagerFileCacheUtil} from "../../lib/cache";
import {Manager} from "../../manager";

let logo = SystemIcons.windows
if (isMac) {
    logo = SystemIcons.apple
} else if (isLinux) {
    logo = SystemIcons.linux
}

export const AppPlugin: PluginRecord = {
    name: 'app',
    title: '应用软件',
    version: '1.0.0',
    logo: logo,
    description: '提供系统应用软件的搜索和打开',
    main: null,
    preload: null,
    actions: []
}

const list = async () => {
    let apps: AppRecord[] = []
    if (isMac) {
        apps = await ManagerAppMac.list()
    } else if (isWin) {
        apps = await ManagerAppWin.list()
    } else if (isLinux) {
        apps = await ManagerAppLinux.list()
    }
    return apps
}

const listActions = async () => {
    // await sleep(3500)
    return await MemoryCacheUtil.remember('AppActions', async () => {
        const actions: ActionRecord[] = []
        const apps = await list()
        apps.forEach(app => {
            const matches: ActionMatch[] = []
            matches.push({
                type: ActionMatchTypeEnum.TEXT,
                text: app.name
            } as ActionMatch)
            if (app.title !== app.name) {
                matches.push({
                    type: ActionMatchTypeEnum.TEXT,
                    text: app.title
                } as ActionMatch)
            }
            actions.push({
                fullName: `${AppPlugin.name}/${app.name}`,
                pluginName: AppPlugin.name,
                name: app.name,
                title: app.title,
                icon: app.icon,
                type: ActionTypeEnum.COMMAND,
                matches: matches,
                data: {
                    command: app.command
                }
            })
        })
        // console.log('actions', actions)
        return actions
    })
}

type ActionInfo = {
    time: number
    actions: ActionRecord[]
}

let listActionRunning = false
export const getAppPlugin = async () => {
    AppPlugin.actions = []
    let toastTimer = null
    const cacheInfo = await ManagerFileCacheUtil.getIgnoreExpire('AppActions', [])
    AppPlugin.actions = cacheInfo.value
    let shouldNotice = false
    if (!cacheInfo.isCache || cacheInfo.expire < Date.now()) {
        if (!listActionRunning) {
            shouldNotice = true
            listActionRunning = true
            listActions().then(actions => {
                // console.log('find.actions', actions)
                AppPlugin.actions = actions
                ManagerFileCacheUtil.set('AppActions', actions, 1000 * 3600)
                if (toastTimer) {
                    clearTimeout(toastTimer)
                } else if (shouldNotice) {
                    Manager.setNotice({
                        text: '应用软件索引完成',
                        type: 'success',
                        duration: 5000,
                    }).then()
                }
                listActionRunning = false
                ManagerSystem.clearCache()
            })
        }
    }
    if (!AppPlugin.actions.length && shouldNotice) {
        toastTimer = setTimeout(() => {
            Manager.setNotice('正在分析应用软件，稍后才可以搜索到应用软件哦~').then()
            toastTimer = null
        }, 3000)
    }
    return AppPlugin
}
