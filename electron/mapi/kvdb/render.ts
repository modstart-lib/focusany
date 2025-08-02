import {Doc} from "./types";
import {ipcRenderer} from "electron";

const put = async (name: string, doc: Doc) => {
    return ipcRenderer.invoke("kvdb:put", name, doc);
};

const putForce = async (name: string, doc: Doc) => {
    return ipcRenderer.invoke("kvdb:putForce", name, doc);
};

const get = async (name: string, id: string) => {
    return ipcRenderer.invoke("kvdb:get", name, id);
};

const remove = async (name: string, doc: Doc | string) => {
    return ipcRenderer.invoke("kvdb:remove", name, doc);
};

const bulkDocs = async (name: string, docs: any[]) => {
    return ipcRenderer.invoke("kvdb:bulkDocs", name, docs);
};

const allDocs = async (name: string, key: string) => {
    return ipcRenderer.invoke("kvdb:allDocs", name, key);
};

const allKeys = async (name: string, key: string) => {
    return ipcRenderer.invoke("kvdb:allKeys", name, key);
};

const count = async (name: string, key: string) => {
    return ipcRenderer.invoke("kvdb:count", name, key);
};

const postAttachment = async (name: string, docId: string, attachment: any, type: string) => {
    return ipcRenderer.invoke("kvdb:postAttachment", name, docId, attachment, type);
};

const getAttachment = async (name: string, docId: string) => {
    return ipcRenderer.invoke("kvdb:getAttachment", name, docId);
};

const getAttachmentType = async (name: string, docId: string) => {
    return ipcRenderer.invoke("kvdb:getAttachmentType", name, docId);
};

const dumpToFile = async (file: string) => {
    return ipcRenderer.invoke("kvdb:dumpToFile", file);
};

const importFromFile = async (file: string) => {
    return ipcRenderer.invoke("kvdb:importFromFile", file);
};

const testWebdav = async (option: {url: string; username: string; password: string}) => {
    return ipcRenderer.invoke("kvdb:testWebdav", option);
};

const dumpToWebDav = async (
    file: string,
    option: {
        url: string;
        username: string;
        password: string;
    }
) => {
    return ipcRenderer.invoke("kvdb:dumpToWebDav", file, option);
};

const importFromWebDav = async (
    file: string,
    option: {
        url: string;
        username: string;
        password: string;
    }
) => {
    return ipcRenderer.invoke("kvdb:importFromWebDav", file, option);
};

const listWebDav = async (
    dir: string,
    option: {
        url: string;
        username: string;
        password: string;
    }
) => {
    return ipcRenderer.invoke("kvdb:listWebDav", dir, option);
};

export default {
    put,
    putForce,
    get,
    remove,
    bulkDocs,
    allDocs,
    allKeys,
    count,
    postAttachment,
    getAttachment,
    getAttachmentType,
    dumpToFile,
    importFromFile,
    testWebdav,
    dumpToWebDav,
    importFromWebDav,
    listWebDav,
};
