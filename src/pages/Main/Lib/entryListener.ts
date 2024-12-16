import {useManagerStore} from "../../../store/modules/manager";

const manager = useManagerStore()

let clipboardState = {
    textInit: false,
    textLast: '' as string,
    imageInit: false,
    imageLast: '',
    filesInit: false,
    filesLastJson: '' as string,
}

export const EntryListener = {
    prepareSearch: async (option: {
        // 主动粘贴
        isPaste?: boolean,
        // 快速面板
        isFastPanel?: boolean,
    }) => {

        // console.log('EntryListener.prepareSearch', option)

        let searchValue = manager.searchValue

        let files, image, text

        // 选中
        const selectedContent = await window.$mapi.manager.getSelectedContent()

        // 文件
        manager.setCurrentFiles([])
        if (selectedContent && selectedContent.type === 'file' && selectedContent.files?.length > 0) {
            manager.setCurrentFiles(selectedContent.files as ClipboardFileItem[])
        } else {
            files = await window.$mapi.manager.getClipboardFiles()
            const filesJson = JSON.stringify(files);
            if (!clipboardState.filesInit) {
                clipboardState.filesLastJson = filesJson
                clipboardState.filesInit = true
            } else if (clipboardState.filesLastJson !== filesJson) {
                clipboardState.filesLastJson = filesJson
                manager.setCurrentFiles(files as ClipboardFileItem[])
            } else if (option.isPaste) {
                clipboardState.filesLastJson = filesJson
                manager.setCurrentFiles(files as ClipboardFileItem[])
            }
        }

        // 图片
        manager.setCurrentImage('')
        if (!manager.currentFiles.length) {
            image = await window.$mapi.app.getClipboardImage()
            if (!clipboardState.imageInit) {
                clipboardState.imageLast = image
                clipboardState.imageInit = true
            } else if (clipboardState.imageLast !== image) {
                clipboardState.imageLast = image
                manager.setCurrentImage(image)
            } else if (option.isPaste) {
                clipboardState.imageLast = image
                manager.setCurrentImage(image)
            }
        }
        // 文本
        manager.setCurrentText('')
        if (!manager.currentFiles.length && !manager.currentImage) {
            if (selectedContent && selectedContent.type === 'text' && selectedContent.text) {
                manager.setCurrentText(selectedContent.text)
            } else {
                text = await window.$mapi.app.getClipboardText()
                // console.log('text', text, clipboardState.textInit, clipboardState.textLast, option.isPaste)
                if (!clipboardState.textInit) {
                    clipboardState.textLast = text
                    clipboardState.textInit = true
                } else if (clipboardState.textLast !== text) {
                    clipboardState.textLast = text
                    manager.setCurrentText(text)
                } else if (option.isPaste) {
                    clipboardState.textLast = text
                    manager.setCurrentText(text)
                }
            }
        }
        if (!option.isFastPanel && manager.currentText) {
            // 单行复制的文本，直接粘贴到搜索框
            if (
                manager.currentText.split('\n').length === 1
                &&
                manager.currentText.length < 100
            ) {
                searchValue = manager.currentText
                manager.setCurrentText('')
            }
        }

        if (option.isFastPanel) {
            await manager.searchFastPanel(searchValue)
        } else {
            await manager.search(searchValue)
        }

        // console.log('prepareSearch', {selectedContent, searchValue, files, image, text})
        // nextTick(() => {
        //     console.log('state', JSON.stringify({
        //         searchValue,
        //         image: manager.currentImage,
        //         files: manager.currentFiles,
        //         text: manager.currentText
        //     }, null, 2))
        // })
    }
}

