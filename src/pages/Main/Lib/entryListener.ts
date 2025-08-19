import {useManagerStore} from "../../../store/modules/manager";
import {ClipboardDataType, SelectedContent} from "../../../types/Manager";
import {TimeUtil} from "../../../lib/util";

const manager = useManagerStore();

export const EntryListener = {
    prepareSearch: async (option: {
        // 主动粘贴
        isPaste?: boolean;
        // 快速面板
        isFastPanel?: boolean;
    }) => {
        // console.log('EntryListener.prepareSearch', option)
        option = Object.assign(
            {
                isPaste: false,
                isFastPanel: false,
            },
            option
        );
        // console.log('EntryListener.prepareSearch', option)

        let searchValue = manager.searchValue;

        let selectedContent: SelectedContent | null = null;

        // the fast panel should check the selected content
        if (option.isFastPanel) {
            selectedContent = await window.$mapi.manager.getSelectedContent();
        }

        const clipboardContent: ClipboardDataType | null = await window.$mapi.manager.getClipboardContent();

        let useClipboard = false;
        // first use clipboard
        if (manager.showFirstRun) {
            manager.showFirstRun = false;
            const clipboardChangeTime = await window.$mapi.manager.getClipboardChangeTime();
            // only use clipboard if it has changed in the last 3 seconds
            if (clipboardChangeTime > 0 && clipboardChangeTime > TimeUtil.timestamp() - 3) {
                useClipboard = true;
            }
        }
        if (!useClipboard && option.isPaste) {
            useClipboard = true;
        }

        // files
        manager.setCurrentFiles([]);
        if (selectedContent && selectedContent.type === "file" && selectedContent.files?.length) {
            manager.setCurrentFiles(selectedContent.files as FileItem[]);
        } else if (useClipboard && clipboardContent && clipboardContent.type === "file" && clipboardContent.files?.length) {
            manager.setCurrentFiles(clipboardContent.files as FileItem[]);
        }

        // image
        manager.setCurrentImage("");
        if (useClipboard && clipboardContent && clipboardContent.type === "image" && clipboardContent.image) {
            manager.setCurrentImage(clipboardContent.image);
        }

        // text
        manager.setCurrentText("");
        if (selectedContent && selectedContent.type === "text" && selectedContent.text) {
            manager.setCurrentText(selectedContent.text);
        } else if (useClipboard && clipboardContent && clipboardContent.type === "text" && clipboardContent.text) {
            manager.setCurrentText(clipboardContent.text);
        }
        if (!option.isFastPanel && manager.currentText) {
            if (manager.currentText.split("\n").length === 1 && manager.currentText.length < 100) {
                if (
                    !manager.searchLastKeywords
                    ||
                    (manager.searchLastKeywords && manager.searchLastKeywords !== manager.currentText)
                ) {
                    searchValue = manager.currentText;
                    manager.setCurrentText("");
                }
            }
        }

        if (option.isFastPanel) {
            await manager.searchFastPanel(searchValue);
        } else {
            await manager.search(searchValue);
        }

        // console.log('state', JSON.stringify({
        //     searchValue,
        //     option,
        //     useClipboard,
        //     clipboardContent,
        //     image: manager.currentImage,
        //     files: manager.currentFiles,
        //     text: manager.currentText
        // }, null, 2))
    },
};
