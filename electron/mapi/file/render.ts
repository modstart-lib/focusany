import fileIndex from './index'
import { ipcRenderer, webUtils } from 'electron'

const openFile = async (options: {} = {}) => {
    return ipcRenderer.invoke('file:openFile', options)
}

const openDirectory = async (options: {} = {}) => {
    return ipcRenderer.invoke('file:openDirectory', options)
}

const openSave = async (options: {} = {}) => {
    return ipcRenderer.invoke('file:openSave', options)
}

// Electron 32 removed the non-standard `File.path` property, `webUtils` is the
// supported way to resolve the on-disk path of a dropped or pasted File.
const getPathForFile = (file: File): string => {
    try {
        return webUtils.getPathForFile(file)
    } catch (e) {
        return ''
    }
}

export default {
    ...fileIndex,
    openFile,
    openDirectory,
    openSave,
    getPathForFile,
}
