import {listFiles} from "../util";
import path from 'node:path';
import {AppRecord} from "../type";
import {getIcon} from "./icon";
import {ConfigLang} from "../../../../../../config/lang";
import {getAppTitle} from "./title";

const appSet = new Set<string>();

export const ManagerAppMac = {
    list: async () => {
        return lists()
    },
}

const lists = async (): Promise<AppRecord[]> => {
    appSet.clear()
    let files = await listFiles([
        '/Applications',
        '~/Applications',
        '/System/Applications',
        '/System/Library/PreferencePanes',
    ])
    const apps = []
    const locale = ConfigLang.getLocale()
    for (const f of files) {
        if (appSet.has(f.pathname)) {
            // console.log('appSet.has', f.pathname)
            continue
        }
        const extname = path.extname(f.pathname);
        if (extname !== '.app' && extname !== '.prefPane') {
            continue
        }
        const app = {
            name: f.name.replace(/\.(app|prefPane)$/, ''),
            title: f.name,
            pathname: f.pathname,
            icon: null,
            command: null,
        }
        app.icon = await getIcon(app.pathname, app.name)
        app.title = await getAppTitle(locale, app.pathname, app.name);
        if (!app.icon) {
            continue
        }
        app.command = `open ${app.pathname.replace(/ /g, '\\ ') as string}`
        appSet.add(app.pathname)
        apps.push(app)
    }
    return apps
}

