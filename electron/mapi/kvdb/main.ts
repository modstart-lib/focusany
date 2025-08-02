import KVDB from "./kvdb";
import {AppEnv} from "../env";
import {DBError, Doc} from "./types";
import {ipcMain} from "electron";
import {WebDav} from "./webdav";

let kvdb: KVDB = null;

const init = () => {
    kvdb = new KVDB(AppEnv.userData);
    kvdb.init();
    // for (let i = 0; i < 1000; i++) {
    //     kvdb.putRaw({
    //         _id: `data${i}`,
    //         data: i
    //     })
    // }
    // const sync = async () => {
    //     KVDBCloudManager.sync().then(() => {
    //         setTimeout(sync, 5000)
    //     })
    // }
    // setTimeout(sync, 1000)
};

const raw = () => {
    return kvdb;
};

const put = async (name: string, data: Doc<any>) => {
    const result = await kvdb.put(name, data);
    if (result && (result as DBError).error) {
        throw (result as DBError).message;
    }
    return result as Doc<any>;
};

const putForce = async (name: string, data: Doc<any>) => {
    const res = await get(name, data._id);
    if (res) {
        data._rev = res._rev;
    }
    const result = await put(name, data);
    if (result && (result as DBError).error) {
        throw (result as DBError).message;
    }
    return result as Doc<any>;
};

const get = async (name: string, id: string) => {
    return await kvdb.get(name, id);
};

const getData = async (name: string, id: string, defaultValue: any = null) => {
    const res = await get(name, id);
    if (res) {
        delete res._id;
        delete res._rev;
        delete res._attachments;
    }
    return res ? res : defaultValue;
};

const remove = async (name: string, doc: Doc<any> | string) => {
    return await kvdb.remove(name, doc);
};

const bulkDocs = async (name: string, docs: any[]) => {
    const result = await kvdb.bulkPut(name, docs);
    if (result && (result as DBError).error) {
        throw (result as DBError).message;
    }
    return result as Doc<any>[];
};

const allDocs = async (name: string, key: string): Promise<Doc[]> => {
    const result = await kvdb.all(name, key);
    if (result && (result as DBError).error) {
        throw (result as DBError).message;
    }
    return result as Doc<any>[];
};

const allKeys = async (name: string, key: string): Promise<string[]> => {
    const result = await kvdb.allKeys(name, key);
    if (result && (result as DBError).error) {
        throw (result as DBError).message;
    }
    return result as string[];
};

const count = async (name: string, key: string) => {
    const result = await kvdb.count(name, key);
    if (result && (result as DBError).error) {
        throw (result as DBError).message;
    }
    return result as number;
};

const postAttachment = async (name: string, docId: string, attachment: any, type: string) => {
    return await kvdb.postAttachment(name, docId, attachment, type);
};

const getAttachment = async (name: string, docId: string) => {
    return await kvdb.getAttachment(name, docId);
};

const getAttachmentType = async (name: string, docId: string) => {
    const res = await get(name, docId);
    if (!res || !res._attachments) return null;
    const result = res._attachments[0];
    return result ? result.content_type : null;
};

const dumpToFile = async (file: string) => {
    return await kvdb.dumpToFile(file);
};

const importFromFile = async (file: string) => {
    return await kvdb.importFromFile(file);
};

const testWebdav = async (option: {url: string; username: string; password: string}) => {
    const webdav = new WebDav(option);
    await webdav.checkConnection();
};

const dumpToWebDav = async (
    file: string,
    option: {
        url: string;
        username: string;
        password: string;
    }
) => {
    return await kvdb.dumpToWavDav(file, option);
};

const importFromWebDav = async (
    file: string,
    option: {
        url: string;
        username: string;
        password: string;
    }
) => {
    return await kvdb.importFromWebDav(file, option);
};

const listWebDav = async (
    dir: string,
    option: {
        url: string;
        username: string;
        password: string;
    }
) => {
    const webdav = new WebDav(option);
    await webdav.checkConnection();
    return await webdav.listDir(dir);
};

ipcMain.handle("kvdb:put", (event, name: string, data: Doc<any>) => {
    return put(name, data);
});

ipcMain.handle("kvdb:putForce", (event, name: string, data: Doc<any>) => {
    return putForce(name, data);
});

ipcMain.handle("kvdb:get", (event, name: string, id: string) => {
    return get(name, id);
});

ipcMain.handle("kvdb:remove", (event, name: string, doc: Doc<any> | string) => {
    return remove(name, doc);
});

ipcMain.handle("kvdb:bulkDocs", (event, name: string, docs: any[]) => {
    return bulkDocs(name, docs);
});

ipcMain.handle("kvdb:allDocs", (event, name: string, key: string) => {
    return allDocs(name, key);
});

ipcMain.handle("kvdb:allKeys", (event, name: string, key: string) => {
    return allKeys(name, key);
});

ipcMain.handle("kvdb:count", (event, name: string, key: string) => {
    return count(name, key);
});

ipcMain.handle("kvdb:postAttachment", (event, name: string, docId: string, attachment: any, type: string) => {
    return postAttachment(name, docId, attachment, type);
});

ipcMain.handle("kvdb:getAttachment", (event, name: string, docId: string) => {
    return getAttachment(name, docId);
});

ipcMain.handle("kvdb:getAttachmentType", (event, name: string, docId: string) => {
    return getAttachmentType(name, docId);
});

ipcMain.handle("kvdb:dumpToFile", (event, file: string) => {
    return dumpToFile(file);
});

ipcMain.handle("kvdb:importFromFile", (event, file: string) => {
    return importFromFile(file);
});

ipcMain.handle(
    "kvdb:testWebdav",
    (
        event,
        option: {
            url: string;
            username: string;
            password: string;
        }
    ) => {
        return testWebdav(option);
    }
);

ipcMain.handle(
    "kvdb:dumpToWebDav",
    (
        event,
        file: string,
        option: {
            url: string;
            username: string;
            password: string;
        }
    ) => {
        return dumpToWebDav(file, option);
    }
);

ipcMain.handle(
    "kvdb:importFromWebDav",
    (
        event,
        file: string,
        option: {
            url: string;
            username: string;
            password: string;
        }
    ) => {
        return importFromWebDav(file, option);
    }
);

ipcMain.handle(
    "kvdb:listWebDav",
    (
        event,
        dir: string,
        option: {
            url: string;
            username: string;
            password: string;
        }
    ) => {
        return listWebDav(dir, option);
    }
);

export const KVDBMain = {
    raw,
    put,
    putForce,
    get,
    getData,
    remove,
    bulkDocs,
    allDocs,
    allKeys,
    postAttachment,
    getAttachment,
    getAttachmentType,
    dumpToFile,
    importFromFile,
    dumpToWebDav,
    importFromWebDav,
    listWebDav,
};

export default {
    init,
    ...KVDBMain,
};
