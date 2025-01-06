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

export const ManagerClipboard = {
    MAX_LIMIT: 1000,
    running: true,
    interval: 1000,
    timer: null,
    watchNextTime: 0,
    lastContentJson: null,
    lastChangeTimestamp: 0,
    encryptKey: null,
    gettingSelectedContent: false,
    async getSelectedContent(): Promise<ClipboardDataType | null> {
        this.gettingSelectedContent = true
        const old = await this._getClipboardContent()
        clipboard.clear();
        ManagerHotkeySimulate.keyTap(KeyboardKey.C, [isMac ? KeyboardKey.Meta : KeyboardKey.Ctrl])
        // await new Promise((resolve) => setTimeout(resolve, 200));
        const select = await this._getClipboardContent()
        clipboard.clear();
        if (old) {
            switch (old.type) {
                case 'file':
                    setClipboardFiles(old.files.map(file => file.path))
                    break
                case 'image':
                    AppsMain.setClipboardImage(old.image)
                    break
                case 'text':
                    AppsMain.setClipboardText(old.text)
                    break
            }
        }
        this.gettingSelectedContent = false
        return select
    },
    async init() {
        this.encryptKey = await StorageMain.get('clipboard', 'encryptKey', null)
        if (!this.encryptKey) {
            this.encryptKey = StrUtil.randomString(16)
            await StorageMain.set('clipboard', 'encryptKey', this.encryptKey)
        }
        this.monitorStart()
        // console.log('all', await this.list())
    },
    async _getClipboardContent(): Promise<ClipboardDataType | null> {
        const files = getClipboardFiles()
        if (files.length) {
            return {
                type: 'file',
                files: files
            } as ClipboardDataType
        }
        const image = AppsMain.getClipboardImage()
        if (image) {
            return {
                type: 'image',
                image: image
            } as ClipboardDataType
        }
        const text = AppsMain.getClipboardText()
        if (text) {
            return {
                type: 'text',
                text: text
            } as ClipboardDataType
        }
        return null
    },
    async getClipboardContent(): Promise<ClipboardDataType | null> {
        while (this.gettingSelectedContent) {
            await sleep(10)
        }
        const content = await this._getClipboardContent()
        this.watchNextTime = Date.now() + this.interval
        const contentJson = JSON.stringify(content)
        if (null == this.lastContentJson || contentJson !== this.lastContentJson) {
            this.lastContentJson = contentJson
            this.lastChangeTimestamp = TimeUtil.timestamp()
            this.onChange(content).then()
        }
        return content
    },
    _watch() {
        if (this.watchNextTime > Date.now()) {
            setTimeout(() => {
                this._watch()
            }, Math.max(this.watchNextTime - Date.now(), 0))
            return
        }
        this.getClipboardContent().finally(() => {
            if (this.running) {
                setTimeout(() => {
                    this._watch()
                }, Math.max(this.watchNextTime - Date.now(), 0));
            }
        })
    },
    monitorStart() {
        this.running = true;
        this._watch();
    },
    monitorStop() {
        this.running = false;
    },
    encrypt(data: ClipboardHistoryRecord) {
        const dataJson = JSON.stringify(data)
        return EncodeUtil.aesEncode(dataJson, this.encryptKey)
    },
    decrypt(data: string): ClipboardHistoryRecord {
        data = EncodeUtil.aesDecode(data, this.encryptKey)
        try {
            return JSON.parse(data) as ClipboardHistoryRecord
        } catch (e) {
            return null
        }
    },
    async onChange(data: ClipboardDataType) {
        if (!data) {
            return
        }
        // console.log('clipboard.onChange', data)
        const filename = TimeUtil.timestampDayStart()
        const saveData = {
            type: data.type,
            timestamp: TimeUtil.timestamp(),
            files: data.files,
            image: data.image,
            text: data.text
        } as ClipboardHistoryRecord
        if (saveData.image) {
            const imageMd5 = EncodeUtil.md5(saveData.image)
            let imageFile = `clipboard/${filename}/${imageMd5}`
            Files.writeBuffer(imageFile, FileUtil.base64ToBuffer(saveData.image)).then()
            saveData.image = imageMd5
        }
        const dataString = this.encrypt(saveData)
        await Files.appendText(`clipboard/${filename}/data`, `${dataString}\n`)
        await ManagerPluginEvent.firePluginEvent('ClipboardChange', saveData)
    },
    async list(): Promise<ClipboardHistoryRecord[]> {
        const fullPath = await Files.fullPath('clipboard')
        const dateDir = await Files.list('clipboard')
        const result = []
        for (const dir of dateDir) {
            const data = await Files.read(`clipboard/${dir.name}/data`)
            for (const line of data.split('\n')) {
                if (!line) {
                    continue
                }
                const record = this.decrypt(line)
                if (!record) {
                    continue
                }
                if (record.image) {
                    record.image = `file://${fullPath}/${dir.name}/${record.image}`
                }
                result.push(record)
                if (result.length > ManagerClipboard.MAX_LIMIT) {
                    break
                }
            }
            if (result.length > ManagerClipboard.MAX_LIMIT) {
                break
            }
        }
        return result.reverse()
    },
    async clear() {
        await Files.deletes('clipboard')
    },
    async delete(timestamp: number) {
        const date = TimeUtil.timestampDayStart(timestamp * 1000)
        const data = await Files.read(`clipboard/${date}/data`)
        const lines = data.split('\n')
        const result = []
        for (const line of lines) {
            if (!line) {
                continue
            }
            const record = this.decrypt(line)
            if (!record) {
                continue
            }
            if (record.timestamp !== timestamp) {
                result.push(line)
            }
        }
        await Files.write(`clipboard/${date}/data`, result.join('\n'))
    }
}
