import {listFiles} from "../util";
import path from "path";

export const ManagerAppLinux = {
    list: async () => {
        return lists()
    }
}

const lists = async () => {
    const files = await listFiles([
        "/usr/share/applications",
        "/var/lib/snapd/desktop/applications",
        `${process.env.HOME}/.local/share/applications`,
    ])
    for (const file of files) {
        if (path.extname(file.pathname) !== ".desktop") {
            continue
        }
        //TODO
    }
    return []
}
