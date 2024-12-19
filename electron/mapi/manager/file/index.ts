import {Files} from "../../file/main";

export const ManagerFile = {
    filePath: null,
    isReady: false,
    async init() {

    },
    async ready() {
        this.isReady = true
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
