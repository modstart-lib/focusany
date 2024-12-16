import {listFiles} from "../util";
import path from "path";
import os from "os";
import {shell} from "electron";
import {AppRecord} from "../type";
import {ShellUtil} from "../../../../../../lib/util";
import {getIcon} from "./icon";
import {getAppTitle} from "./title";

export const ManagerAppWin = {
    list: async () => {

        return lists()
    }
}

const apps: AppRecord[] = [];
const appSet = new Set<string>();

const blackList = [
    'msiexec.exe'
]

const readDir = async (dir: string) => {
    let files = await listFiles([dir])
    for (const f of files) {
        if (f.isDirectory) {
            await readDir(f.pathname)
        } else {
            let name = f.name.split('.')[0]
            let appDetail: any = {};
            try {
                appDetail = shell.readShortcutLink(f.pathname);
            } catch (e) {
                //
            }
            const pathname = appDetail.target
            if (!pathname
                || appSet.has(pathname)
                || !pathname.endsWith('.exe')
                || pathname.endsWith('uninst.exe')
                || pathname.endsWith('uninstall.exe')
            ) {
                continue
            }
            appSet.add(pathname)
            name = path.basename(appDetail.target, '.exe')
            if (blackList.includes(name)) {
                continue
            }
            const title = await getAppTitle('zh-CN', pathname, name)
            const app = {
                name,
                title,
                pathname,
                icon: await getIcon(appDetail.target, name),
                command: `start "dummyclient" ${ShellUtil.quotaPath(appDetail.target)}`
            }
            // console.log('app', app)
            apps.push(app)
        }
    }
}

const lists = async (): Promise<AppRecord[]> => {
    appSet.clear()
    await readDir('C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs')
    await readDir(path.join(os.homedir(), './AppData/Roaming', 'Microsoft\\Windows\\Start Menu\\Programs'))
    // console.log('apps', apps)
    return apps
}
