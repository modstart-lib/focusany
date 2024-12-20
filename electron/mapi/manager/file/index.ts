import {Files} from "../../file/main";
import nodePath from "node:path";

export const ManagerFile = {
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
    openQueue(filePath: string) {
        this.filePath = filePath
        this.openFileEditor()
    },
    openFileEditor() {
        console.log('openFileEditor', {
            filePath: this.filePath,
            isReady: this.isReady
        })
        if (!this.isReady) {
            setTimeout(() => {
                this.openFileEditor()
            }, 100)
            return
        }
        try {
            console.log('openFileEditor.start')
            Files.write('openFile.json', JSON.stringify({filePath: this.filePath}))
            console.log('openFileEditor.end')
        } catch (e) {
            console.error('openFileEditor.error', e)
        }
    }
}
