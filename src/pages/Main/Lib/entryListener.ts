import {useManagerStore} from "../../../store/modules/manager";
import {ClipboardDataType, SelectedContent} from "../../../types/Manager";
import {TimeUtil} from "../../../lib/util";

const manager = useManagerStore()

export const EntryListener = {
    prepareSearch: async (option: {
        // 主动粘贴
        isPaste?: boolean,
        // 快速面板
        isFastPanel?: boolean,
    }) => {

        // console.log('EntryListener.prepareSearch', option)
        option = Object.assign({
            isPaste: false,
            isFastPanel: false,
        }, option)

        // console.log('EntryListener.prepareSearch', option)

        // 清除搜索框
        if (manager.searchValue) {
            // 如果10分钟未变化，清空搜索框，避免弹出对话框是上一次的搜索内容
            if (manager.searchValueUpdateTimestamp > 0 && manager.searchValueUpdateTimestamp < TimeUtil.timestamp() - 10 * 60) {
                manager.searchValue = ''
            }
        }

        let searchValue = manager.searchValue

        // 选中，只有快捷面板才获取
        let selectedContent: SelectedContent | null = null
        if (option.isFastPanel) {
            selectedContent = await window.$mapi.manager.getSelectedContent()
        }

        const clipboardContent: ClipboardDataType | null = await window.$mapi.manager.getClipboardContent()
        const clipboardChangeTime = await window.$mapi.manager.getClipboardChangeTime()
        // 最近6秒内的剪切板变更才会被视为有效
        let useClipboard = false
        if (manager.searchValueUpdateTimestamp > 0 && !manager.searchValue) {
            if (clipboardChangeTime > TimeUtil.timestamp() - 6) {
                useClipboard = true
            }
        }

        // 文件
        manager.setCurrentFiles([])
        if (selectedContent && selectedContent.type === 'file' && selectedContent.files?.length) {
            manager.setCurrentFiles(selectedContent.files as FileItem[])
        } else if (clipboardContent && clipboardContent.type === 'file' && clipboardContent.files?.length) {
            if (useClipboard || option.isPaste) {
                manager.setCurrentFiles(clipboardContent.files as FileItem[])
            }
        }

        // 图片
        manager.setCurrentImage('')
        if (clipboardContent && clipboardContent.type === 'image' && clipboardContent.image) {
            if (useClipboard || option.isPaste) {
                manager.setCurrentImage(clipboardContent.image)
            }
        }
        // 文本
        manager.setCurrentText('')
        if (selectedContent && selectedContent.type === 'text' && selectedContent.text) {
            manager.setCurrentText(selectedContent.text)
        } else if (clipboardContent && clipboardContent.type === 'text' && clipboardContent.text) {
            if (useClipboard || option.isPaste) {
                manager.setCurrentText(clipboardContent.text)
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

        // console.log('state', JSON.stringify({
        //     searchValue,
        //     option,
        //     useClipboard,
        //     clipboardContent,
        //     clipboardChangeTime,
        //     image: manager.currentImage,
        //     files: manager.currentFiles,
        //     text: manager.currentText
        // }, null, 2))
    }
}

