import {Files} from "../../file/main";
import nodePath from "node:path";
import {Log} from "../../log/main";
import {Manager} from "../manager";
import {SearchQuery} from "../type";

export const ManagerEditor = {
    filePath: null,
    isReady: false,
    async init() {

    },
    async ready() {
        this.isReady = true
    },
    faDataTypeCache: {},
    async getFaDataTypeCached(file: string) {
        if (file in this.faDataTypeCache) {
            return this.faDataTypeCache[file]
        }
        const fileExt = nodePath.extname(file).toLowerCase()
        if (fileExt !== '.fadata') {
            return null
        }
        try {
            const result = await Files.read(file, {
                isFullPath: true
            })
            const json = JSON.parse(result)
            this.faDataTypeCache[file] = json['type']
            return null
        } catch (e) {
            this.faDataTypeCache[file] = null
        }
        return null
    },
    async filterFaDataType(files: FileItem[], types: string[]) {
        const newFiles = []
        for (const file of files) {
            const fileExt = nodePath.extname(file.path).toLowerCase()
            if (fileExt !== '.fadata') {
                continue
            }
            const fileType = await this.getFaDataTypeCached(file.path)
            if (!fileType) {
                continue
            }
        }
        return newFiles
    },
    async openQueue(filePath: string) {
        this.filePath = filePath
        await this.openFileEditor()
    },
    async openFileEditor() {
        return new Promise<any>(async (resolve) => {
            const run = async () => {
                if (!this.isReady) {
                    setTimeout(run, 100)
                    return
                }
                if (!this.filePath) {
                    Log.info('ManagerEditor.openFileEditor.Empty', this.filePath)
                    return
                }
                if (!await Files.exists(this.filePath, {isFullPath: true})) {
                    Log.info('ManagerEditor.openFileEditor.NotFound', this.filePath)
                    return
                }
                const fileExt = nodePath.extname(this.filePath).toLowerCase()
                const file: FileItem = {
                    name: nodePath.basename(this.filePath),
                    isDirectory: false,
                    isFile: true,
                    path: this.filePath,
                    fileExt: fileExt.replace('.', ''),
                }
                const actions = await Manager.matchActionSimple({
                    currentFiles: [file],
                } as SearchQuery)
                if (actions.length > 0) {
                    Manager.openAction(actions[0]).then()
                }
                resolve(undefined)
            }
            run().then()
        });
    }
}
