import {useManagerStore} from "../../../store/modules/manager";
import {computed} from "vue";

const {Menu} = require('@electron/remote');

const manager = useManagerStore()

export const useSearchOperate = (emit) => {

    const hasActions = computed(() => {
        return manager.searchActions.length > 0
            || manager.matchActions.length > 0
            || manager.historyActions.length > 0
            || manager.pinActions.length > 0;
    });

    const doShowMenu = () => {
        const menuTemplate: any[] = []
        if (manager.activePlugin) {
            menuTemplate.push({
                label: '独立窗口显示',
                click: () => {
                    doDetachPlugin().then()
                }
            })
            menuTemplate.push({
                label: '插件调试',
                click: () => {
                    manager.openMainPluginDevTools().then()
                }
            });
        }
        if (!menuTemplate.length) {
            return
        }
        Menu.buildFromTemplate(menuTemplate).popup();
    };

    const doDetachPlugin = async () => {
        await manager.detachPlugin()
    }

    const onSearchKeydown = (e, key: string) => {
        const {ctrlKey, shiftKey, altKey, metaKey} = e;
        const modifiers: Array<string> = [];
        ctrlKey && modifiers.push('control');
        shiftKey && modifiers.push('shift');
        altKey && modifiers.push('alt');
        metaKey && modifiers.push('meta');
        let fireKey = '';
        switch (key) {
            case 'up':
            case 'down':
            case 'left':
            case 'right':
            case 'enter':
                if (hasActions.value) {
                    fireKey = key;
                }
                break;
            case 'esc':
                manager.hideMainWindow().then()
                break
            default:
                switch (e.keyCode) {
                    case 8:
                        if (manager.searchValue === '') {
                            fireKey = 'delete';
                        }
                        break;
                    case 86:
                        if (manager.searchValue === '') {
                            if (ctrlKey || metaKey) {
                                fireKey = 'paste';
                            }
                        }
                        break;
                }
                break;
        }
        if (fireKey) {
            e.preventDefault();
            emit('onInputKey', fireKey);
        }
    };

    const clipboardFilesInfo = computed<{
        name: string,
        extName: string
    }>(() => {
        const result = {
            name: '多个文件',
            extName: 'ext.unknown'
        }
        if (manager.currentFiles.length <= 0) {
            return result
        }
        // 只有一个文件的情况
        if (manager.currentFiles.length === 1) {
            const file = manager.currentFiles[0];
            result.name = file.name;
            result.extName = file.name;
            if (file.isDirectory) {
                result.extName = 'ext.folder';
            }
            if (result.name.endsWith('.fada')) {
                result.name = result.name.substring(0, result.name.length - 5);
            }
            return result;
        }
        // 如果全部是目录
        const directoryCount = manager.currentFiles.filter(f => f.isDirectory).length;
        if (directoryCount === manager.currentFiles.length) {
            result.name = '多个文件夹';
            result.extName = 'ext.folder';
            return result
        }
        // 如果全部是文件
        const fileCount = manager.currentFiles.filter(f => f.isFile).length;
        if (fileCount === manager.currentFiles.length) {
            // 如果全部是图片
            const imageCount = manager.currentFiles.filter(f => {
                const ext = f.name.split('.').pop()?.toLowerCase();
                return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '');
            }).length;
            if (imageCount === manager.currentFiles.length) {
                result.name = '多个图片';
                result.extName = 'ext.png';
                return result
            }
        }
        return result
    });

    const onSearchDoubleClick = () => {
        if (manager.activePlugin) {
            doDetachPlugin().then()
        }
    }

    return {
        onSearchKeydown,
        onSearchDoubleClick,
        doShowMenu,
        clipboardFilesInfo
    }
}
