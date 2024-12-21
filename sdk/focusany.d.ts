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

declare type PluginEvent = 'ClipboardChange'

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

    /**
     * 插件应用初始化完成时触发
     * @param callback
     */
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

    /**
     * 插件应用退出时触发
     * @param callback
     */
    onPluginExit(callback: Function): void;

    /**
     * 插件事件触发
     * @param event
     * @param callback
     */
    onPluginEvent(event: PluginEvent, callback: (data: any) => void): void;

    /**
     * 插件主窗口是否显示
     */
    isMainWindowShown(): boolean;

    /**
     * 隐藏插件主窗口
     */
    hideMainWindow(): boolean;

    /**
     * 显示插件主窗口
     */
    showMainWindow(): boolean;

    /**
     * 快捷面板窗口是否显示
     */
    isFastPanelWindowShown(): boolean;

    /**
     * 显示快捷面板窗口
     */
    showFastPanelWindow(): boolean;

    /**
     * 隐藏快捷面板窗口
     */
    hideFastPanelWindow(): boolean;

    /**
     * 设置插件的高度
     * @param height
     */
    setExpendHeight(height: number): void;

    /**
     * 设置输入框监听
     * @param onChange
     * @param placeholder
     * @param isFocus
     * @param isVisible
     */
    setSubInput(onChange: (keywords: string) => void, placeholder?: string, isFocus?: boolean, isVisible?: boolean): boolean;

    /**
     * 移除输入框监听
     */
    removeSubInput(): boolean;

    /**
     * 获取子输入框的值
     * @param value
     */
    setSubInputValue(value: string): boolean;

    /**
     * 子输入框失去焦点
     */
    subInputBlur(): boolean;

    /**
     * 获取插件根目录
     */
    getPluginRoot(): string;

    /**
     * 获取插件配置
     */
    getPluginConfig(): any;

    /**
     * 获取插件信息
     */
    getPluginInfo(): any;

    /**
     * 获取插件环境
     */
    getPluginEnv(): 'dev' | 'prod';

    /**
     * 获取插件查询信息
     * @param requestId
     */
    getQuery(requestId: string): SearchQuery;

    /**
     * 创建窗口
     * @param url
     * @param options
     * @param callback
     */
    createBrowserWindow(url: string, options: BrowserWindow.InitOptions, callback?: () => void): BrowserWindow.WindowInstance;

    /**
     * 关闭插件
     */
    outPlugin(): boolean;

    /**
     * 获取插件的主窗口
     */
    isDarkColors(): boolean;

    /**
     * 设置插件动作
     * @param action
     */
    setAction(action: PluginAction | PluginAction[]): boolean;

    /**
     * 移除插件动作
     * @param name
     */
    removeAction(name: string): boolean;

    /**
     * 获取插件动作
     * @param names
     */
    getActions(names?: string[]): PluginAction[];

    /**
     * 打开插件动作
     * @param keywordsOrAction
     * @param query
     */
    redirect(keywordsOrAction: string | string[], query?: SearchQuery): void;

    /**
     * 显示提示
     * @param body
     * @param options
     */
    showToast(body: string, options?: {
        duration?: number,
        status?: 'info' | 'success' | 'error'
    }): void;

    /**
     * 显示通知
     * @param body
     * @param clickActionName
     */
    showNotification(body: string, clickActionName?: string): void;

    /**
     * 显示消息框
     * @param message
     * @param options
     */
    showMessageBox(message: string, options: {
        title?: string,
        yes?: string,
        no?: string,
    }): void;

    /**
     * 打开文件选择框
     * @param options
     */
    showOpenDialog(options: {
        title?: string,
        defaultPath?: string,
        buttonLabel?: string,
        filters?: { name: string, extensions: string[] }[],
        properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory' | 'promptToCreate' | 'noResolveAliases' | 'treatPackageAsDirectory' | 'dontAddToRecent'>,
        message?: string,
        securityScopedBookmarks?: boolean
    }): (string[]) | (undefined)

    /**
     * 打开文件保存框
     * @param options
     */
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

    /**
     * 截图
     * @param callback
     */
    screenCapture(callback: (imgBase64: string) => void): void;

    /**
     * 获取设备ID
     */
    getNativeId(): string;

    /**
     * 获取软件版本
     */
    getAppVersion(): string;

    /**
     * 获取路径
     * @param name
     */
    getPath(name: 'home' | 'appData' | 'userData' | 'temp' | 'exe' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'logs'): string;

    /**
     * 获取文件图标
     * @param path
     */
    getFileIcon(path: string): string;

    /**
     * 复制文件到剪贴板
     * @param file
     */
    copyFile(file: string | string[]): boolean;

    /**
     * 复制图片到剪贴板
     * @param image
     */
    copyImage(image: string): boolean;

    /**
     * 复制文本到剪贴板
     * @param text
     */
    copyText(text: string): boolean;

    /**
     * 获取剪贴板文本
     */
    getClipboardText(): string;

    /**
     * 获取剪贴板图片
     */
    getClipboardImage(): string;

    /**
     * 获取剪贴板文件
     */
    getClipboardFiles(): FileItem[];

    /**
     * 打开路径
     * @param fullPath
     */
    shellOpenPath(fullPath: string): void;

    /**
     * 显示文件夹
     * @param fullPath
     */
    shellShowItemInFolder(fullPath: string): void;

    /**
     * 打开链接
     * @param url
     */
    shellOpenExternal(url: string): void;

    /**
     * 播放声音
     */
    shellBeep(): void;

    /**
     * 模拟键盘按键
     * @param key
     * @param modifiers
     */
    simulateKeyboardTap(key: string, modifiers: ('ctrl' | 'shift' | 'command' | 'option' | 'alt')[]): void;

    /**
     * 模拟鼠标按下
     */
    getCursorScreenPoint(): { x: number, y: number };

    /**
     * 获取显示器
     * @param point
     */
    getDisplayNearestPoint(point: { x: number, y: number }): any;

    /**
     * 是否是MacOS
     */
    isMacOs(): boolean;

    /**
     * 是否是Windows
     */
    isWindows(): boolean;

    /**
     * 是否是Linux
     */
    isLinux(): boolean;

    /**
     * 获取平台架构
     */
    getPlatformArch(): string;

    /**
     * 发送后端事件
     * @param event
     * @param data
     * @param option
     */
    sendBackendEvent(event: string, data?: any, option?: {
        timeout: number
    }): Promise<any>;

    /**
     * 数据库操作
     */
    db: {
        /**
         * 添加文档
         * @param doc
         */
        put(doc: DbDoc): DbReturn;
        /**
         * 获取文档
         * @param id
         */
        get<T extends {} = Record<string, any>>(id: string): DbDoc<T> | null;
        /**
         * 删除文档
         * @param doc
         */
        remove(doc: string | DbDoc): DbReturn;
        /**
         * 批量添加文档
         * @param docs
         */
        bulkDocs(docs: DbDoc[]): DbReturn[];
        /**
         * 批量获取文档
         * @param key
         */
        allDocs<T extends {} = Record<string, any>>(key?: string): DbDoc<T>[];
        /**
         * 保存附件
         * @param docId
         * @param attachment
         * @param type
         */
        postAttachment(docId: string, attachment: Uint8Array, type: string): DbReturn;
        /**
         * 获取附件
         * @param docId
         */
        getAttachment(docId: string): Uint8Array | null;
        /**
         * 获取附件类型
         * @param docId
         */
        getAttachmentType(docId: string): string | null;
    };

    /**
     * 本地存储
     */
    dbStorage: {
        /**
         * 设置存储
         * @param key
         * @param value
         */
        setItem(key: string, value: any): void;
        /**
         * 获取存储
         * @param key
         */
        getItem<T = any>(key: string): T;
        /**
         * 移除存储
         * @param key
         */
        removeItem(key: string): void;
    };

    /**
     * 快捷面板
     */
    fastPanel: {
        /**
         * 设置快捷面板当前插件渲染区域的高度
         * @param height
         */
        setHeight(height: number): void;
        /**
         * 获取快捷面板当前插件渲染区域的高度
         */
        getHeight(): Promise<number>;
    },

    /**
     * 分离窗口
     */
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

    /**
     * 工具
     */
    util: {
        /**
         * 生成随机字符串
         * @param length
         */
        randomString(length: number): string;
        /**
         * Buffer 转 Base64
         * @param buffer
         */
        bufferToBase64(buffer: Uint8Array): string;
        /**
         * 获取当前时间戳字符串
         */
        datetimeString(): string;
        /**
         * 数据转 Base64
         * @param data
         */
        base64Encode(data: any): string;
        /**
         * Base64 转数据
         * @param data
         */
        base64Decode(data: string): any;
        /**
         * MD5 摘要
         * @param data
         */
        md5(data: string): string;
        /**
         * 保存文件
         * @param filename
         * @param data
         * @param option
         */
        save(filename: string, data: string | Uint8Array, option?: {
            isBase64?: boolean,
        }): boolean;
    };
}

declare var focusany: FocusAnyApi;
