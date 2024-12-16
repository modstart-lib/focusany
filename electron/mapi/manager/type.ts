import {BrowserView, BrowserWindow} from "electron";
import {PluginRecord} from "../../../src/types/Manager";


export type PluginContext = (BrowserView | {}) & {
    _plugin: PluginRecord,
    _window?: BrowserWindow,
}

export type SearchQuery = {
    keywords: string,
    currentFiles?: ClipboardFileItem[],
    currentImage?: string,
    currentText?: string,
}
