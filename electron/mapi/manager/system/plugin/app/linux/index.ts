import {listFiles} from "../util";
import path from "path";
import {ConfigLang} from "../../../../../../config/lang";
import {getIcon} from "./icon";
import {getAppTitle} from "./title";
import fs from "node:fs";

export const ManagerAppLinux = {
    list: async () => {
        return lists();
    },
};

const appSet = new Set<string>();

const lists = async () => {
    appSet.clear();
    const files = await listFiles([
        "/usr/share/applications",
        "/var/lib/snapd/desktop/applications",
        `${process.env.HOME}/.local/share/applications`,
    ]);
    const apps = [];
    const locale = ConfigLang.getLocale();
    for (const f of files) {
        if (appSet.has(f.pathname)) {
            // console.log('appSet.has', f.pathname)
            continue;
        }
        const extname = path.extname(f.pathname);
        if (extname !== ".desktop") {
            continue;
        }
        const app = {
            name: f.name.replace(/\.(desktop)$/, ""),
            title: f.name,
            pathname: f.pathname,
            icon: null,
            command: null,
        };
        const desktopInfo = await parseDesktopFile(app.pathname);
        app.icon = await getIcon(desktopInfo, app.pathname, app.name);
        app.title = await getAppTitle(desktopInfo, locale, app.pathname, app.name);
        if (!app.icon) {
            continue;
        }
        if (!desktopInfo.Exec) {
            continue;
        }
        let command = desktopInfo.Exec.replace(/ %[A-Za-z]/g, "")
            .replace(/"/g, "")
            .trim();
        if (desktopInfo.Terminal === "true") {
            command = `gnome-terminal -x ${command}`;
        }
        app.command = command;
        appSet.add(app.pathname);
        apps.push(app);
    }
    return apps;
};

const parseDesktopFile = async (pathname: string): Promise<Record<string, string>> => {
    const content = fs.readFileSync(pathname, "utf-8");
    const desktop = {};
    for (const line of content.split("\n")) {
        if (line.startsWith("[")) {
            continue;
        }
        const [key, value] = line.split("=");
        if (!key || !value) {
            continue;
        }
        desktop[key] = value;
    }
    return desktop;
};
