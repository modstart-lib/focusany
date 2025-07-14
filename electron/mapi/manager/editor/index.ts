import {Files} from "../../file/main";
import nodePath from "node:path";
import {Log} from "../../log/main";
import {Manager} from "../manager";
import {SearchQuery} from "../type";
import {AppsMain} from "../../app/main";

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
        if (fileExt !== '.fad') {
            return null
        }
        try {
            const result = await Files.read(file, {
                isFullPath: true
            })
            const json = JSON.parse(result)
            this.faDataTypeCache[file] = json['type']
        } catch (e) {
            this.faDataTypeCache[file] = null
        }
        return this.faDataTypeCache[file]
    },
    async filterFadType(files: FileItem[], types: string[]) {
        const newFiles = []
        for (const file of files) {
            const fileExt = nodePath.extname(file.path).toLowerCase()
            if (fileExt !== '.fad') {
                continue
            }
            const fileType = await this.getFaDataTypeCached(file.path)
            if (!fileType) {
                continue
            }
            if (types.includes(fileType)) {
                newFiles.push(file)
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
                    activeWindow: null,
                } as SearchQuery)
                // Log.info('ManagerEditor.openFileEditor.Actions', JSON.stringify(actions, null, 2))
                if (actions.length > 0) {
                    Manager.openAction(JSON.parse(JSON.stringify(actions[0]))).then()
                } else {
                    AppsMain.toast('没有找到可以打开文件的插件', {
                        status: 'error'
                    })
                }
                resolve(undefined)
            }
            run().then()
        });
    }
}
