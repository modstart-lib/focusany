import {BrowserView, BrowserWindow} from "electron";
import {ActiveWindow, PluginRecord} from "../../../src/types/Manager";

export type PluginContext = (BrowserView | {}) & {
    _plugin: PluginRecord;
    _window?: BrowserWindow;
    _event?: {
        [key: string]: any[];
    };
};

export type SearchQuery = {
    keywords: string;
    currentFiles?: FileItem[];
    currentImage?: string;
    currentText?: string;
    activeWindow?: ActiveWindow;
};
