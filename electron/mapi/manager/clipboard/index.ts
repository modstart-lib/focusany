import {AppsMain} from "../../app/main";
import {ClipboardDataType, ClipboardHistoryRecord} from "../../../../src/types/Manager";
import {Files} from "../../file/main";
import {EncodeUtil, FileUtil, sleep, StrUtil, TimeUtil} from "../../../lib/util";
import StorageMain from "../../storage/main";
import {getClipboardFiles, setClipboardFiles} from "./clipboardFiles";
import {clipboard} from "electron";
import {isMac} from "../../../lib/env";
import {KeyboardKey, ManagerHotkeySimulate} from "../hotkey/simulate";
import {ManagerPluginEvent} from "../plugin/event";
import {Log} from "../../log/main";

export const ManagerClipboard = {
    MAX_LIMIT: 1000,
    running: true,
    interval: 1000,
    timer: null,
    watchNextTime: 0,
    lastContentJson: null,
    lastChangeTimestamp: 0,
    encryptKey: null,
    clipboardBusy: false,
    clipboardBackupData: null as ClipboardDataType | null,
    async init() {
        this.encryptKey = await StorageMain.get("clipboard", "encryptKey", null);
        if (!this.encryptKey) {
            this.encryptKey = StrUtil.randomString(16);
            await StorageMain.set("clipboard", "encryptKey", this.encryptKey);
        }
        this.monitorStart();
        // console.log('all', await this.list())
    },
    async waitClipboardFree() {
        while (this.clipboardBusy) {
            await sleep(10);
        }
    },
    async backupClipboard() {
        await this.waitClipboardFree();
        this.clipboardBusy = true;
        this.clipboardBackupData = await this._getClipboardContent();
        clipboard.clear();
    },
    async restoreClipboard() {
        clipboard.clear();
        if (this.clipboardBackupData) {
            await this._setClipboardContent(this.clipboardBackupData);
            this.clipboardBackupData = null;
        }
        this.clipboardBusy = false;
    },
    async getSelectedContent(): Promise<ClipboardDataType | null> {
        await this.backupClipboard();
        ManagerHotkeySimulate.keyTap(KeyboardKey.C, [isMac ? KeyboardKey.Meta : KeyboardKey.Ctrl]);
        await new Promise(resolve => setTimeout(resolve, 200));
        const select = await this._getClipboardContent();
        await this.restoreClipboard();
        return select;
    },

    async _setClipboardContent(data: ClipboardDataType): Promise<void> {
        switch (data.type) {
            case "file":
                setClipboardFiles(data.files.map(file => file.path));
                break;
            case "image":
                AppsMain.setClipboardImage(data.image);
                break;
            case "text":
                AppsMain.setClipboardText(data.text);
                break;
        }
    },
    async _getClipboardContent(): Promise<ClipboardDataType | null> {
        const files = getClipboardFiles();
        if (files.length) {
            return {
                type: "file",
                files: files,
            } as ClipboardDataType;
        }
        const image = AppsMain.getClipboardImage();
        if (image) {
            return {
                type: "image",
                image: image,
            } as ClipboardDataType;
        }
        const text = AppsMain.getClipboardText();
        if (text) {
            return {
                type: "text",
                text: text,
            } as ClipboardDataType;
        }
        return null;
    },
    async pasteClipboardContent(data: ClipboardDataType): Promise<void> {
        if (!data) {
            return;
        }
        await this.backupClipboard();
        await this._setClipboardContent(data);
        ManagerHotkeySimulate.keyTap(KeyboardKey.V, [isMac ? KeyboardKey.Meta : KeyboardKey.Ctrl]);
        await sleep(200);
        await this.restoreClipboard();
    },
    async getClipboardContent(): Promise<ClipboardDataType | null> {
        await this.waitClipboardFree();
        const content = await this._getClipboardContent();
        this.watchNextTime = Date.now() + this.interval;
        const contentJson = JSON.stringify(content);
        if (null == this.lastContentJson || contentJson !== this.lastContentJson) {
            if (this.lastContentJson) {
                this.lastChangeTimestamp = TimeUtil.timestamp();
            }
            this.lastContentJson = contentJson;
            this.onChange(content).then();
        }
        return content;
    },
    _watch() {
        if (this.watchNextTime > Date.now()) {
            setTimeout(() => {
                this._watch();
            }, Math.max(this.watchNextTime - Date.now(), 0));
            return;
        }
        this.getClipboardContent().finally(() => {
            if (this.running) {
                setTimeout(() => {
                    this._watch();
                }, Math.max(this.watchNextTime - Date.now(), 0));
            }
        });
    },
    monitorStart() {
        this.running = true;
        this._watch();
    },
    monitorStop() {
        this.running = false;
    },
    encrypt(data: ClipboardHistoryRecord) {
        const dataJson = JSON.stringify(data);
        return EncodeUtil.aesEncode(dataJson, this.encryptKey);
    },
    decrypt(data: string): ClipboardHistoryRecord {
        try {
            data = EncodeUtil.aesDecode(data, this.encryptKey);
            return JSON.parse(data) as ClipboardHistoryRecord;
        } catch (e) {
            return null;
        }
    },
    async onChange(data: ClipboardDataType) {
        if (!data) {
            return;
        }
        // console.log('clipboard.onChange', data)
        const filename = TimeUtil.timestampDayStart();
        const saveData = {
            type: data.type,
            timestamp: TimeUtil.timestamp(),
            files: data.files,
            image: data.image,
            text: data.text,
        } as ClipboardHistoryRecord;
        if (saveData.image) {
            const imageMd5 = EncodeUtil.md5(saveData.image);
            let imageFile = `clipboard/${filename}/${imageMd5}`;
            Files.writeBuffer(imageFile, FileUtil.base64ToBuffer(saveData.image), {isDataPath: true}).then();
            saveData.image = imageMd5;
        }
        const dataString = this.encrypt(saveData);
        // console.log('clipboard.write', `clipboard/${filename}/data`, dataString)
        await Files.appendText(`clipboard/${filename}/data`, `${dataString}\n`, {isDataPath: true});
        await ManagerPluginEvent.firePluginEvent("ClipboardChange", saveData);
    },
    async list(limit: number = -1): Promise<ClipboardHistoryRecord[]> {
        const fullPath = await Files.fullPath("clipboard");
        const dateDir = await Files.list("clipboard", {isDataPath: true});
        // 按照倒序排列 pathname
        dateDir.sort((a, b) => {
            return b.pathname.localeCompare(a.pathname);
        });
        const result = [];
        let maxLimitReached = false;
        for (const dir of dateDir) {
            if (maxLimitReached) {
                await Files.deletes(`clipboard/${dir.name}`, {isDataPath: true});
                continue;
            }
            const data = await Files.read(`clipboard/${dir.name}/data`, {isDataPath: true});
            if (!data) {
                await Files.deletes(`clipboard/${dir.name}`, {isDataPath: true});
                Log.error('ManagerClipboard.list', `Deleted empty clipboard directory: clipboard/${dir.name}`);
                continue;
            }
            for (const line of data.split("\n").reverse()) {
                if (!line) {
                    continue;
                }
                const record = this.decrypt(line);
                if (!record) {
                    continue;
                }
                if (record.image) {
                    record.image = `file://${fullPath}/${dir.name}/${record.image}`;
                }
                result.push(record);
                if (limit > 0 && result.length >= limit) {
                    break;
                }
                if (result.length > ManagerClipboard.MAX_LIMIT) {
                    maxLimitReached = true;
                    break;
                }
            }
            if (limit > 0 && result.length >= limit) {
                break;
            }
        }
        return result;
    },
    async clear() {
        await Files.deletes("clipboard", {isDataPath: true});
    },
    async delete(timestamp: number) {
        const date = TimeUtil.timestampDayStart(timestamp * 1000);
        const data = await Files.read(`clipboard/${date}/data`, {isDataPath: true});
        const lines = data.split("\n");
        const result = [];
        for (const line of lines) {
            if (!line) {
                continue;
            }
            const record = this.decrypt(line);
            if (!record) {
                continue;
            }
            if (record.timestamp !== timestamp) {
                result.push(line);
            }
        }
        await Files.write(`clipboard/${date}/data`, result.join("\n"), {isDataPath: true});
    },
};
