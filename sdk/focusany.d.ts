/// <reference path="electron-browser-window.d.ts"/>
/// <reference path="electron.d.ts"/>

declare interface Window {
    focusany: FocusAnyApi
}


type DbDoc<T extends {} = Record<string, any>> = {
    _id: string,
    _rev?: string,
} & T

interface DbReturn {
    id: string,
    rev?: string,
    ok?: boolean,
    error?: boolean,
    name?: string,
    message?: string
}

declare type PlatformType = 'win' | 'osx' | 'linux'

declare type ActionMatch = (
    ActionMatchText
    | ActionMatchKey
    | ActionMatchRegex
    | ActionMatchFile
    | ActionMatchImage
    | ActionMatchWindow
    | ActionMatchEditor
    )

declare enum ActionMatchTypeEnum {
    TEXT = 'text',
    KEY = 'key',
    REGEX = 'regex',
    IMAGE = 'image',
    FILE = 'file',
    WINDOW = 'window',
    EDITOR = 'editor',
}

type SearchQuery = {
    keywords: string,
    currentFiles?: FileItem[],
    currentImage?: string,
    currentText?: string,
}

type FileItem = {
    name: string,
    isDirectory: boolean,
    isFile: boolean,
    path: string,
    fileExt: string,
}

declare type ActionMatchBase = {
    type: ActionMatchTypeEnum,
    name?: string,
}

declare type ActionMatchText = ActionMatchBase & {
    text: string,
    minLength: number,
    maxLength: number,
}

declare type ActionMatchKey = ActionMatchBase & {
    key: string,
}

declare type ActionMatchRegex = ActionMatchBase & {
    regex: string,
    title: string,
    minLength: number,
    maxLength: number,
}

declare type ActionMatchFile = ActionMatchBase & {
    title: string,
    minCount: number,
    maxCount: number,
    filterFileType: 'file' | 'directory',
    filterExtensions: string[],
}

declare type ActionMatchImage = ActionMatchBase & {
    title: string,
}

declare type ActionMatchWindow = ActionMatchBase & {
    nameRegex: string,
    titleRegex: string,
    attrRegex: Record<string, string>,
}

declare type ActionMatchEditor = ActionMatchBase & {
    extensions: string[],
    faDataTypes: string[],
}

interface PluginAction {
    fullName?: string,
    name: string,
    title: string,
    matches: ActionMatch[],
    platform?: PlatformType[],
    icon?: string,
    type?: 'command' | 'web' | 'code' | 'backend',
}

interface FocusAnyApi {
    onPluginReady(
        callback: (data: {
            actionName: string,
            actionMatch: ActionMatch | null,
            actionMatchFiles: FileItem[],
            requestId: string,
            reenter: boolean,
            isFastPanel: boolean,
        }) => void
    ): void;

    onPluginExit(callback: Function): void;

    isMainWindowShown(): boolean;

    hideMainWindow(): boolean;

    showMainWindow(): boolean;

    isFastPanelWindowShown(): boolean;

    showFastPanelWindow(): boolean;

    hideFastPanelWindow(): boolean;

    setExpendHeight(height: number): void;

    setSubInput(onChange: (keywords: string) => void, placeholder?: string, isFocus?: boolean, isVisible?: boolean): boolean;

    removeSubInput(): boolean;

    setSubInputValue(value: string): boolean;

    subInputBlur(): boolean;

    getPluginRoot(): string;

    getPluginConfig(): any;

    getPluginInfo(): any;

    getPluginEnv(): 'dev' | 'prod';

    getQuery(requestId: string): SearchQuery;

    createBrowserWindow(url: string, options: BrowserWindow.InitOptions, callback?: () => void): BrowserWindow.WindowInstance;

    outPlugin(): boolean;

    isDarkColors(): boolean;

    setAction(action: PluginAction | PluginAction[]): boolean;

    removeAction(name: string): boolean;

    getActions(names?: string[]): PluginAction[];

    redirect(keywordsOrAction: string | string[], query?: SearchQuery): void;

    showToast(body: string, options?: {
        duration?: number,
        status?: 'info' | 'success' | 'error'
    }): void;

    showNotification(body: string, clickActionName?: string): void;

    showMessageBox(message: string, options: {
        title?: string,
        yes?: string,
        no?: string,
    }): void;

    showOpenDialog(options: {
        title?: string,
        defaultPath?: string,
        buttonLabel?: string,
        filters?: { name: string, extensions: string[] }[],
        properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory' | 'promptToCreate' | 'noResolveAliases' | 'treatPackageAsDirectory' | 'dontAddToRecent'>,
        message?: string,
        securityScopedBookmarks?: boolean
    }): (string[]) | (undefined)


    showSaveDialog(options: {
        title?: string,
        defaultPath?: string,
        buttonLabel?: string,
        filters?: { name: string, extensions: string[] }[],
        message?: string,
        nameFieldLabel?: string,
        showsTagField?: string,
        properties?: Array<'showHiddenFiles' | 'createDirectory' | 'treatPackageAsDirectory' | 'showOverwriteConfirmation' | 'dontAddToRecent'>,
        securityScopedBookmarks?: boolean
    }): (string) | (undefined);

    screenCapture(callback: (imgBase64: string) => void): void;

    getNativeId(): string;

    getAppVersion(): string;

    getPath(name: 'home' | 'appData' | 'userData' | 'temp' | 'exe' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'logs'): string;

    getFileIcon(path: string): string;

    copyFile(file: string | string[]): boolean;

    copyImage(image: string): boolean;

    copyText(text: string): boolean;

    getClipboardText(): string;

    getClipboardImage(): string;

    getClipboardFiles(): FileItem[];

    shellOpenPath(fullPath: string): void;

    shellShowItemInFolder(fullPath: string): void;

    shellOpenExternal(url: string): void;

    shellBeep(): void;

    simulateKeyboardTap(key: string, modifiers: ('ctrl' | 'shift' | 'command' | 'option' | 'alt')[]): void;

    getCursorScreenPoint(): { x: number, y: number };

    getDisplayNearestPoint(point: { x: number, y: number }): any;

    isMacOs(): boolean;

    isWindows(): boolean;

    isLinux(): boolean;

    getPlatformArch(): string;

    sendBackendEvent(event: string, data?: any, option?: {
        timeout: number
    }): Promise<any>;

    db: {
        put(doc: DbDoc): DbReturn;
        get<T extends {} = Record<string, any>>(id: string): DbDoc<T> | null;
        remove(doc: string | DbDoc): DbReturn;
        bulkDocs(docs: DbDoc[]): DbReturn[];
        allDocs<T extends {} = Record<string, any>>(key?: string): DbDoc<T>[];
        postAttachment(docId: string, attachment: Uint8Array, type: string): DbReturn;
        getAttachment(docId: string): Uint8Array | null;
        getAttachmentType(docId: string): string | null;
    };

    dbStorage: {
        setItem(key: string, value: any): void;
        getItem<T = any>(key: string): T;
        removeItem(key: string): void;
    };

    fastPanel: {
        /**
         * 设置超级面板当前插件渲染区域的高度
         * @param height
         */
        setHeight(height: number): void;
        /**
         * 获取超级面板当前插件渲染区域的高度
         */
        getHeight(): Promise<number>;
    },

    detach: {
        /**
         * 设置分离窗口的标题
         * @param title
         */
        setTitle(title: string): void;
        /**
         * 设置分离窗口的位置
         * @param position
         */
        setPosition(position: 'center' | 'right-bottom' | 'left-top' | 'right-top' | 'left-bottom'): void;
        /**
         * 设置分离窗口是否置顶
         * @param alwaysOnTop
         */
        setAlwaysOnTop(alwaysOnTop: boolean): void;
        /**
         * 设置分离窗口的大小
         */
        setSize(width: number, height: number): void;
    },

    util: {
        randomString(length: number): string;
        bufferToBase64(buffer: Uint8Array): string;
        datetimeString(): string;
        base64Encode(data: any): string;
        base64Decode(data: string): any;
        md5(data: string): string;
        save(filename: string, data: string | Uint8Array, option?: {
            isBase64?: boolean,
        }): boolean;
    };
}

declare var focusany: FocusAnyApi;
