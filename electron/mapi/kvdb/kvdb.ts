import path from "path";
import fs from "fs";
import PouchDB from "pouchdb";
import {DBError, Doc, DocRes} from "./types";

import replicationStream from "pouchdb-replication-stream";
import load from "pouchdb-load";
import {KVDBVersionManager} from "./version";
import {Log} from "../log/main";

import ndj from "ndjson";
import through from "through2";
import {WebDav} from "./webdav";
import {AppEnv} from "../env";

PouchDB.plugin(replicationStream.plugin);
// @ts-ignore
PouchDB.adapter("writableStream", replicationStream.adapters.writableStream);
PouchDB.plugin({loadIt: load.load});

export default class KVDB {
    readonly docMaxByteLength;
    readonly docAttachmentMaxByteLength;
    public dbpath;
    public defaultDbName;
    public pouchDB: any;
    public versionControl: boolean;

    constructor() {
        // 2M
        this.docMaxByteLength = 2 * 1024 * 1024;
        // 20M
        this.docAttachmentMaxByteLength = 20 * 1024 * 1024;
        let dbPath = AppEnv.dataRoot;
        if (fs.existsSync(path.join(AppEnv.userData, "kvdb"))) {
            dbPath = AppEnv.userData;
        }
        this.dbpath = dbPath;
        this.defaultDbName = path.join(dbPath, "kvdb");
        this.versionControl = true;
    }

    init(): void {
        fs.existsSync(this.dbpath) ||
        fs.mkdirSync(this.dbpath, {
            recursive: true,
        });
        this.pouchDB = new PouchDB(this.defaultDbName, {auto_compaction: true, adapter: "leveldb"});
    }

    getDocId(name: string, id: string): string {
        return name + "/" + id;
    }

    replaceDocId(name: string, id: string): string {
        return id.replace(name + "/", "");
    }

    errorInfo(name: string, message: string): DBError {
        return {error: true, name, message};
    }

    private checkDocSize(doc: Doc) {
        if (Buffer.byteLength(JSON.stringify(doc)) > this.docMaxByteLength) {
            return this.errorInfo("exception", `doc max size ${this.docMaxByteLength / 1024 / 1024} M`);
        }
        return false;
    }

    async put(name: string, doc: Doc, strict = true): Promise<DBError | DocRes> {
        if (strict) {
            const err = this.checkDocSize(doc);
            if (err) return err;
        }
        doc._id = this.getDocId(name, doc._id);
        try {
            const result: DocRes = await this.pouchDB.put(doc);
            if (this.versionControl) {
                if (doc._rev) {
                    KVDBVersionManager.update(doc._id).then();
                } else {
                    KVDBVersionManager.insert(doc._id).then();
                }
            }
            doc._id = result.id = this.replaceDocId(name, result.id);
            return result;
        } catch (e: any) {
            doc._id = this.replaceDocId(name, doc._id);
            return {id: doc._id, name: e.name, error: !0, message: e.message};
        }
    }

    async putRaw(doc: Doc): Promise<DBError | DocRes> {
        let result: Doc | null = null;
        try {
            result = await this.pouchDB.get(doc._id);
        } catch (e) {
        }
        if (result) {
            doc._rev = result._rev;
        }
        try {
            return await this.pouchDB.put(doc);
        } catch (e: any) {
            return {id: doc._id, name: e.name, error: !0, message: e.message};
        }
    }

    async get(name: string, id: string): Promise<Doc | null> {
        try {
            const result: Doc = await this.pouchDB.get(this.getDocId(name, id));
            result._id = this.replaceDocId(name, result._id);
            return result;
        } catch (e) {
            return null;
        }
    }

    async getRaw(id: string) {
        try {
            return await this.pouchDB.get(id);
        } catch (e) {
            return null;
        }
    }

    async remove(name: string, doc: Doc | string) {
        try {
            let target;
            if ("object" == typeof doc) {
                target = doc;
                if (!target._id || "string" !== typeof target._id) {
                    return this.errorInfo("exception", "doc _id error");
                }
                target._id = this.getDocId(name, target._id);
            } else {
                if ("string" !== typeof doc) {
                    return this.errorInfo("exception", "param error");
                }
                target = await this.pouchDB.get(this.getDocId(name, doc));
            }
            const result: DocRes = await this.pouchDB.remove(target);
            if (this.versionControl) {
                KVDBVersionManager.remove(target._id).then();
            }
            target._id = result.id = this.replaceDocId(name, result.id);
            return result;
        } catch (e: any) {
            if ("object" === typeof doc) {
                doc._id = this.replaceDocId(name, doc._id);
            }
            return this.errorInfo(e.name, e.message);
        }
    }

    async removeRaw(doc: Doc) {
        try {
            return await this.pouchDB.remove(doc);
        } catch (e) {
            return null;
        }
    }

    async bulkPut(name: string, docs: Array<Doc<any>>): Promise<DBError | Array<DocRes>> {
        let result;
        try {
            if (!Array.isArray(docs)) return this.errorInfo("exception", "not array");
            if (docs.find(e => !e._id)) return this.errorInfo("exception", "doc not _id field");
            if (new Set(docs.map(e => e._id)).size !== docs.length)
                return this.errorInfo("exception", "_id value exists as");
            for (const doc of docs) {
                const err = this.checkDocSize(doc);
                if (err) return err;
                doc._id = this.getDocId(name, doc._id);
            }
            result = await this.pouchDB.bulkDocs(docs);
            result = result.map((res: any) => {
                res.id = this.replaceDocId(name, res.id);
                return res.error
                    ? {
                        id: res.id,
                        name: res.name,
                        error: true,
                        message: res.message,
                    }
                    : res;
            });
            docs.forEach(doc => {
                if (this.versionControl) {
                    if (doc._rev) {
                        KVDBVersionManager.update(doc._id).then();
                    } else {
                        KVDBVersionManager.insert(doc._id).then();
                    }
                }
                doc._id = this.replaceDocId(name, doc._id);
            });
        } catch (e) {
            //
        }
        return result;
    }

    async all(name: string, key: string | Array<string>): Promise<DBError | Array<Doc<any>>> {
        const config: any = {include_docs: true};
        if (key) {
            if ("string" == typeof key) {
                config.startkey = this.getDocId(name, key);
                config.endkey = config.startkey + "￰";
            } else {
                if (!Array.isArray(key))
                    return this.errorInfo("exception", "param only key(string) or keys(Array[string])");
                config.keys = key.map(key => this.getDocId(name, key));
            }
        } else {
            config.startkey = this.getDocId(name, "");
            config.endkey = config.startkey + "￰";
        }
        const result: Array<any> = [];
        try {
            (await this.pouchDB.allDocs(config)).rows.forEach((res: any) => {
                if (!res.error && res.doc) {
                    res.doc._id = this.replaceDocId(name, res.doc._id);
                    result.push(res.doc);
                }
            });
        } catch (e) {
            //
        }
        return result;
    }

    async allKeys(name: string, key: string | Array<string>): Promise<DBError | Array<string>> {
        const config: any = {include_docs: false};
        if (key) {
            if ("string" == typeof key) {
                config.startkey = this.getDocId(name, key);
                config.endkey = config.startkey + "￰";
            } else {
                if (!Array.isArray(key))
                    return this.errorInfo("exception", "param only key(string) or keys(Array[string])");
                config.keys = key.map(key => this.getDocId(name, key));
            }
        } else {
            config.startkey = this.getDocId(name, "");
            config.endkey = config.startkey + "￰";
        }
        const result: Array<any> = [];
        try {
            (await this.pouchDB.allDocs(config)).rows.forEach((res: any) => {
                if (!res.error && res.id) {
                    const id = this.replaceDocId(name, res.id);
                    result.push(id);
                }
            });
        } catch (e) {
            //
        }
        return result;
    }

    async count(name: string, key: string | Array<string>): Promise<DBError | number> {
        const config: any = {include_docs: false};
        if (key) {
            if ("string" == typeof key) {
                config.startkey = this.getDocId(name, key);
                config.endkey = config.startkey + "￰";
            } else {
                if (!Array.isArray(key))
                    return this.errorInfo("exception", "param only key(string) or keys(Array[string])");
                config.keys = key.map(key => this.getDocId(name, key));
            }
        } else {
            config.startkey = this.getDocId(name, "");
            config.endkey = config.startkey + "￰";
        }
        try {
            return (await this.pouchDB.allDocs(config)).rows.length;
        } catch (e) {
            //
        }
        return 0;
    }

    public async postAttachment(name: string, docId: string, attachment: Buffer | Uint8Array, type: string) {
        const buffer = Buffer.from(attachment);
        if (buffer.byteLength > this.docAttachmentMaxByteLength)
            return this.errorInfo(
                "exception",
                "attachment data up to " + this.docAttachmentMaxByteLength / 1024 / 1024 + "M"
            );
        try {
            const result = await this.pouchDB.put({
                _id: this.getDocId(name, docId),
                _attachments: {0: {data: buffer, content_type: type}},
            });
            if (this.versionControl) {
                KVDBVersionManager.insert(result.id).then();
            }
            result.id = this.replaceDocId(name, result.id);
            return result;
        } catch (e) {
            return this.errorInfo(e.name, e.message);
        }
    }

    async getAttachment(name: string, docId: string, len = "0") {
        try {
            return await this.pouchDB.getAttachment(this.getDocId(name, docId), len);
        } catch (e) {
            return null;
        }
    }

    async getAttachmentRaw(docId: string, len = "0") {
        try {
            return await this.pouchDB.getAttachment(docId, len);
        } catch (e) {
            return null;
        }
    }

    public async dumpToFile(file: string, option?: {}): Promise<void> {
        try {
            const writeStream = fs.createWriteStream(file);
            await this.pouchDB.dump(writeStream, {
                batch_size: 10,
            });
        } catch (e) {
            Log.info("kvdb.dumpToFile.error", e);
            throw e;
        }
    }

    public async importFromFile(file: string, option?: {}): Promise<void> {
        await this.pouchDB.destroy();
        const syncDb = new KVDB();
        syncDb.init();
        this.pouchDB = syncDb.pouchDB;
        const rs = fs.createReadStream(file);
        try {
            await this.load(rs);
        } catch (e) {
            Log.info("kvdb.importFromFile.error", e);
            throw e;
        }
    }

    public async dumpToWavDav(
        file: string,
        option: {
            url: string;
            username: string;
            password: string;
        }
    ): Promise<void> {
        try {
            const webdav = new WebDav(option);
            await webdav.dump(this, file);
        } catch (e) {
            Log.info("kvdb.dumpToWavDav.error", e);
            throw e;
        }
    }

    public async importFromWebDav(
        file: string,
        option: {
            url: string;
            username: string;
            password: string;
        }
    ): Promise<void> {
        await this.pouchDB.destroy();
        const syncDb = new KVDB();
        syncDb.init();
        this.pouchDB = syncDb.pouchDB;
        try {
            const webdav = new WebDav(option);
            await webdav.import(this, file);
        } catch (e) {
            Log.info("kvdb.importFromWebDav.error", e);
            throw e;
        }
    }

    public async load(readableStream: any) {
        return new Promise((resolve, reject) => {
            let error = null;
            let queue = [];
            readableStream
                .pipe(ndj.parse())
                .on("error", function (errorCatched) {
                    error = errorCatched;
                })
                .pipe(
                    through.obj(function (data, _, next) {
                        if (!data.docs) {
                            return next();
                        }
                        // lets smooth it out
                        data.docs.forEach(function (doc) {
                            this.push(doc);
                        }, this);
                        next();
                    })
                )
                .pipe(
                    through.obj(
                        function (doc, _, next) {
                            // console.log('doc', doc)
                            if (doc._attachments) {
                                for (const k in doc._attachments) {
                                    if (doc._attachments[k].data) {
                                        // console.log('doc._attachments[k].data', k, doc._attachments[k].data)
                                        const bytes = doc._attachments[k].data.data;
                                        const base64 = new Buffer(bytes).toString("base64");
                                        doc._attachments[k].data = base64;
                                    }
                                }
                            }
                            queue.push(doc);
                            if (queue.length >= 10) {
                                this.push(queue);
                                queue = [];
                            }
                            next();
                        },
                        function (next) {
                            if (queue.length) {
                                this.push(queue);
                            }
                            next();
                        }
                    )
                )
                .pipe(this.pouchDB.createWriteStream({new_edits: false}))
                .on("error", function (errorCatched) {
                    error = errorCatched;
                })
                .on("finish", function () {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(undefined);
                    }
                });
        });
    }
}
