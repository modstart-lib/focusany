import MemoryStream from "memorystream";

import {AuthType, createClient} from "webdav";
import {WebDAVClient} from "webdav/dist/node/types";
import KVDB from "./kvdb";

type WebDavOptions = {
    username: string;
    password: string;
    url: string;
};

export class WebDav {
    public client: WebDAVClient;

    constructor({username, password, url}: WebDavOptions) {
        // console.log('WebDavOptions', {username, password, url})
        this.client = createClient(url, {
            authType: AuthType.Auto,
            username,
            password,
        });
    }

    async checkConnection(): Promise<void> {
        await this.client.exists("/");
    }

    async listDir(dir: string): Promise<string[]> {
        dir = dir.endsWith("/") ? dir : dir + "/";
        const result = await this.client.getDirectoryContents(dir);
        return (result as any[]).map(item => item.basename);
    }

    async dump(kvdb: KVDB, file: string): Promise<void> {
        await this.checkConnection();
        const fileDir = file.substring(0, file.lastIndexOf("/"));
        if (!(await this.client.exists(fileDir + "/"))) {
            await this.client.createDirectory(fileDir, {
                recursive: true,
            });
        }
        const ws = new MemoryStream();
        kvdb.pouchDB.dump(ws, {
            batch_size: 10,
        });
        return new Promise((resolve, reject) => {
            ws.pipe(
                this.client.createWriteStream(file, {}, () => {
                    resolve();
                })
            );
        });
    }

    async import(kvdb: KVDB, file: string): Promise<void> {
        // console.log('import', file)
        await this.checkConnection();
        if (!(await this.client.exists(file))) {
            throw "FileNotFound";
        }
        const rs = this.client.createReadStream(file);
        await kvdb.load(rs);
    }
}
