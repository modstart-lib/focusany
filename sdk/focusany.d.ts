/// <reference path="electron-browser-window.d.ts"/>
/// <reference path="electron.d.ts"/>

// all the api not end with `Async` are synchronous, and the ones that end with `Async` are asynchronous.

declare interface Window {
    focusany: FocusAnyApi;
}

type DbDoc<T extends {} = Record<string, any>> = {
    _id: string;
    _rev?: string;
} & T;

interface DbReturn {
    id: string;
    rev?: string;
    ok?: boolean;
    error?: boolean;
    name?: string;
    message?: string;
}

declare type BaseResult<T = any> = {
    code: number;
    msg: string;
    data?: T;
};

declare type PlatformType = "win" | "osx" | "linux";

declare type EditionType = "open" | "pro";

declare type PluginEvent = "ClipboardChange" | "UserChange";

declare type HotkeyModifierType = "Control" | "Option" | "Command" | "Ctrl" | "Alt" | "Win" | "Meta" | "Shift";

declare type HotkeyType = { key: string; modifiers: HotkeyModifierType[] };

declare type HotkeyQuickType = "save";

declare type ActionMatch =
    | ActionMatchText
    | ActionMatchKey
    | ActionMatchRegex
    | ActionMatchFile
    | ActionMatchImage
    | ActionMatchWindow
    | ActionMatchEditor;

declare enum ActionMatchTypeEnum {
    TEXT = "text",
    KEY = "key",
    REGEX = "regex",
    IMAGE = "image",
    FILE = "file",
    WINDOW = "window",
    EDITOR = "editor",
}

type SearchQuery = {
    keywords: string;
    currentFiles?: FileItem[];
    currentImage?: string;
    currentText?: string;
};

type FileItem = {
    name: string;
    isDirectory: boolean;
    isFile: boolean;
    path: string;
    fileExt: string;
};

type ActionCodeSetting = {
    type: "list",
    placeholder: string;
}

type ActionCodeExecuteResultItem = {
    id: string;
    icon: string;
    title: string;
    description: string;
    loading?: boolean;
    // additional data
    [key: string]: any;
}

type ActionCodeExecuteResult = {
    command: "data" | "none" | "error" | "close" | "clear";
    // set placeholder when placeholder is set
    placeholder?: string;
    // command === data
    items?: ActionCodeExecuteResultItem[],
    // command === error
    error?: string;
    // additional data
    [key: string]: any;
}

declare type ActionMatchBase = {
    type: ActionMatchTypeEnum;
    name?: string;
};

declare type ActionMatchText = ActionMatchBase & {
    text: string;
    minLength: number;
    maxLength: number;
};

declare type ActionMatchKey = ActionMatchBase & {
    key: string;
};

declare type ActionMatchRegex = ActionMatchBase & {
    regex: string;
    title: string;
    minLength: number;
    maxLength: number;
};

declare type ActionMatchFile = ActionMatchBase & {
    title: string;
    minCount: number;
    maxCount: number;
    filterFileType: "file" | "directory";
    filterExtensions: string[];
};

declare type ActionMatchImage = ActionMatchBase & {
    title: string;
};

declare type ActionMatchWindow = ActionMatchBase & {
    nameRegex: string;
    titleRegex: string;
    attrRegex: Record<string, string>;
};

declare type ActionMatchEditor = ActionMatchBase & {
    extensions: string[];
    fadTypes: string[];
};

interface PluginAction {
    fullName?: string;
    name: string;
    title: string;
    matches: ActionMatch[];
    platform?: PlatformType[];
    icon?: string;
    type?: "command" | "web" | "code" | "backend";
}

interface FocusAnyApi {
    /**
     * Plugin application initialization complete callback
     * @param callback
     */
    onPluginReady(
        callback: (data: {
            actionName: string;
            actionMatch: ActionMatch | null;
            actionMatchFiles: FileItem[];
            requestId: string;
            reenter: boolean;
            isView: boolean;
        }) => void
    ): void;

    /**
     * Plugin application exit callback
     * @param callback
     */
    onPluginExit(callback: Function): void;

    /**
     * Plugin event listener
     * @param event
     * @param callback
     */
    onPluginEvent(event: PluginEvent, callback: (data: any) => void): void;

    /**
     * Plugin event unbind
     * @param event
     * @param callback
     */
    offPluginEvent(event: PluginEvent, callback: (data: any) => void): void;

    /**
     * Plugin event unbind all
     * @param event
     */
    offPluginEventAll(event: PluginEvent): void;

    /**
     * plugin more menu click
     * @param callback
     */
    onMoreMenuClick(callback: (data: { name: string }) => void): void;

    /**
     * register hotkey
     * @param key
     * @param callback
     */
    registerHotkey(key: string | string[] | HotkeyQuickType | HotkeyType | HotkeyType[], callback: () => void): void;

    /**
     * unregister all hotkey
     */
    unregisterHotkeyAll(): void;

    /**
     * Check if plugin main window is shown
     */
    isMainWindowShown(): boolean;

    /**
     * Hide plugin main window
     */
    hideMainWindow(): void;

    /**
     * Show plugin main window
     */
    showMainWindow(): void;

    /**
     * Check if fast panel window is shown
     */
    isFastPanelWindowShown(): boolean;

    /**
     * Show fast panel window
     */
    showFastPanelWindow(): void;

    /**
     * Hide fast panel window
     */
    hideFastPanelWindow(): void;

    /**
     * Set plugin height
     * @param height
     */
    setExpendHeight(height: number): void;

    /**
     * Set input box listener
     * @param onChange
     * @param placeholder
     * @param isFocus
     * @param isVisible
     */
    setSubInput(
        onChange: (keywords: string) => void,
        placeholder?: string,
        isFocus?: boolean,
        isVisible?: boolean
    ): void;

    /**
     * Remove input box listener
     */
    removeSubInput(): void;

    /**
     * Set sub input box value
     * @param value
     */
    setSubInputValue(value: string): void;

    /**
     * Sub input box lose focus
     */
    subInputBlur(): void;

    /**
     * Get plugin root directory
     */
    getPluginRoot(): string;

    /**
     * Get plugin configuration
     */
    getPluginConfig(): {
        name: string;
        title: string;
        version: string;
        logo: string;
    } | null;

    /**
     * Get plugin information
     */
    getPluginInfo(): {
        nodeIntegration: boolean;
        preloadBase: string;
        preload: string;
        main: string;
        mainView: string;
        width: number;
        height: number;
        autoDetach: boolean;
        singleton: boolean;
        zoom: number;
    };

    /**
     * Get plugin environment
     */
    getPluginEnv(): "dev" | "prod";

    /**
     * Get plugin query information
     * @param requestId
     */
    getQuery(requestId: string): SearchQuery;

    /**
     * Create browser window
     * @param url
     * @param options
     * @param callback
     */
    createBrowserWindow(
        url: string,
        options: BrowserWindow.InitOptions,
        callback?: () => void
    ): BrowserWindow.WindowInstance;

    /**
     * Close plugin
     */
    outPlugin(): void;

    /**
     * Check if dark theme
     */
    isDarkColors(): boolean;

    /**
     * Show user login dialog
     */
    showUserLogin(): void;

    /**
     * Get user information
     */
    getUser(): {
        isLogin: boolean;
        avatar: string;
        nickname: string;
        vipFlag: string;
        deviceCode: string;
        openId: string;
    };

    /**
     * Get user server-side temporary token
     */
    getUserAccessToken(): Promise<{
        token: string;
        expireAt: number;
    }>;

    /**
     * List plugin goods
     * @param query
     */
    listGoods(query?: { ids?: string[] }): Promise<
        {
            id: string;
            title: string;
            cover: string;
            priceType: "fixed" | "dynamic";
            fixedPrice: string;
            description: string;
        }[]
    >;

    /**
     * Create order and display payment
     * @param options Order parameters
     */
    openGoodsPayment(options: {
        /**
         * Plugin goods ID
         */
        goodsId: string;
        /**
         * Plugin goods price, no need to pass for fixed price goods, dynamic price goods need to pass price, e.g. 0.01
         */
        price?: string;
        /**
         * Third-party order ID, string, max length 64 characters
         */
        outOrderId?: string;
        /**
         * Parameter data, length not exceeding 200 characters
         */
        outParam?: string;
    }): Promise<{
        /**
         * Whether payment is successful
         */
        paySuccess: boolean;
    }>;

    /**
     * Query plugin goods orders
     * @param options
     */
    queryGoodsOrders(options: {
        /**
         * Plugin goods ID, optional
         */
        goodsId?: string;
        /**
         * Page number, starting from 1, optional
         */
        page?: number;
        /**
         * Page size, optional, default is 10
         */
        pageSize?: number;
    }): Promise<{
        /**
         * Current page number
         */
        page: number;
        /**
         * Total number of orders
         */
        total: number;
        /**
         * Order list
         */
        records: {
            /**
             * Order ID
             */
            id: string;
            /**
             * Goods ID
             */
            goodsId: string;
            /**
             * Status: Paid: Paid, Unpaid: Unpaid
             */
            status: "Paid" | "Unpaid";
        }[];
    }>;

    /**
     * Request official API
     */
    apiPost(url: string, body: any, option: {}): Promise<BaseResult>;

    /**
     * Dynamically set plugin action
     * @param action
     */
    setAction(action: PluginAction | PluginAction[]): void;

    /**
     * Remove plugin action
     * @param name
     */
    removeAction(name: string): void;

    /**
     * Get plugin actions
     * @param names
     */
    getActions(names?: string[]): PluginAction[];

    /**
     * Open plugin action
     * @param keywordsOrAction
     * @param query
     */
    redirect(keywordsOrAction: string | string[], query?: SearchQuery): void;

    /**
     * Show toast notification
     * @param body
     * @param options
     */
    showToast(
        body: string,
        options?: {
            duration?: number;
            status?: "info" | "success" | "error";
        }
    ): void;

    /**
     * Show notification
     * @param body
     * @param clickActionName
     */
    showNotification(body: string, clickActionName?: string): void;

    /**
     * Show message box
     * @param message
     * @param options
     * @return true if "yes" is clicked, false if "no" is clicked
     */
    showMessageBox(
        message: string,
        options: {
            title?: string;
            yes?: string;
            no?: string;
        }
    ): boolean;

    /**
     * Show open file dialog
     * @param options
     */
    showOpenDialog(options: {
        title?: string;
        defaultPath?: string;
        buttonLabel?: string;
        filters?: { name: string; extensions: string[] }[];
        properties?: Array<
            | "openFile"
            | "openDirectory"
            | "multiSelections"
            | "showHiddenFiles"
            | "createDirectory"
            | "promptToCreate"
            | "noResolveAliases"
            | "treatPackageAsDirectory"
            | "dontAddToRecent"
        >;
        message?: string;
        securityScopedBookmarks?: boolean;
    }): string[] | undefined;

    /**
     * Show save file dialog
     * @param options
     */
    showSaveDialog(options: {
        title?: string;
        defaultPath?: string;
        buttonLabel?: string;
        filters?: { name: string; extensions: string[] }[];
        message?: string;
        nameFieldLabel?: string;
        showsTagField?: string;
        properties?: Array<
            | "showHiddenFiles"
            | "createDirectory"
            | "treatPackageAsDirectory"
            | "showOverwriteConfirmation"
            | "dontAddToRecent"
        >;
        securityScopedBookmarks?: boolean;
    }): string | undefined;

    /**
     * Take screenshot
     * @param callback
     */
    screenCapture(callback: (imgBase64: string) => void): void;

    /**
     * Get device ID
     */
    getNativeId(): string;

    /**
     * Get software version
     */
    getAppVersion(): string;

    /**
     * Get system path
     * @param name
     */
    getPath(
        name:
            | "home"
            | "appData"
            | "userData"
            | "temp"
            | "exe"
            | "desktop"
            | "documents"
            | "downloads"
            | "music"
            | "pictures"
            | "videos"
            | "logs"
    ): string;

    /**
     * Get file icon as Base64
     * @param path
     */
    getFileIcon(path: string): string;

    /**
     * Copy file to clipboard
     * @param file
     */
    copyFile(file: string | string[]): boolean;

    /**
     * Copy image to clipboard
     * @param image
     */
    copyImage(image: string): boolean;

    /**
     * Copy text to clipboard
     * @param text
     */
    copyText(text: string): boolean;

    /**
     * Get clipboard text
     */
    getClipboardText(): string;

    /**
     * Get clipboard image
     */
    getClipboardImage(): string;

    /**
     * Get clipboard files
     */
    getClipboardFiles(): FileItem[];

    /**
     * List clipboard history
     */
    listClipboardItems(option?: { limit?: number }): Promise<{
        type: "file" | "image" | "text";
        timestamp: number;
        files?: FileItem[];
        image?: string;
        text?: string;
    }[]>;

    /**
     * Delete clipboard item by timestamp
     * @param timestamp
     */
    deleteClipboardItem(timestamp: number): Promise<void>;

    /**
     * Clear clipboard history
     */
    clearClipboardItems(): Promise<void>;

    /**
     * Open file with default application
     * @param fullPath
     */
    shellOpenPath(fullPath: string): void;

    /**
     * Show file in file manager
     * @param fullPath
     */
    shellShowItemInFolder(fullPath: string): void;

    /**
     * Open URL with external browser
     * @param url
     */
    shellOpenExternal(url: string): void;

    /**
     * Play system beep sound
     */
    shellBeep(): void;

    /**
     * simulate user input
     */
    simulate: {
        /**
         * simulate keyboard tap
         * @param key
         * @param modifiers
         */
        keyboardTap(key: string, modifiers: ("ctrl" | "shift" | "command" | "option" | "alt")[]): Promise<void>;
        /**
         * simulate type string
         * @param text
         */
        typeString(text: string): Promise<void>;
        /**
         * simulate mouse toggle
         * @param type
         * @param button
         */
        mouseToggle(type: "down" | "up", button: "left" | "right" | "middle"): Promise<void>;
        /**
         * simulate mouse move
         * @param x
         * @param y
         */
        mouseMove(x: number, y: number): Promise<void>;
        /**
         * simulate mouse click
         * @param button
         * @param double
         */
        mouseClick(button: "left" | "right" | "middle", double?: boolean): Promise<void>;
    };

    /**
     * Get cursor screen position
     */
    getCursorScreenPoint(): { x: number; y: number };

    /**
     * Get display nearest to point
     * @param point
     */
    getDisplayNearestPoint(point: { x: number; y: number }): any;

    /**
     * Check if running on macOS
     */
    isMacOs(): boolean;

    /**
     * Check if running on Windows
     */
    isWindows(): boolean;

    /**
     * Check if running on Linux
     */
    isLinux(): boolean;

    /**
     * Get platform architecture
     */
    getPlatformArch(): "x86" | "arm64" | null;

    /**
     * Send backend event
     * @param event
     * @param data
     * @param option
     */
    sendBackendEvent(
        event: string,
        data?: any,
        option?: {
            timeout: number;
        }
    ): Promise<any>;

    /**
     * set remote web runtime
     * @param info
     */
    setRemoteWebRuntime(info: {
        userAgent: string;
        urlMap: Record<string, string>;
        types: string[];
        domains: string[];
        blocks: string[];
    }): Promise<undefined>;

    /**
     * list large language model
     */
    llmListModels(): Promise<
        {
            providerId: string;
            providerLogo: string;
            providerTitle: string;
            modelId: string;
            modelName: string;
        }[]
    >;

    /**
     * call large language model chat
     * @param callInfo
     */
    llmChat(callInfo: { providerId: string; modelId: string; message: string }): Promise<
        BaseResult<{
            message: string;
        }>
    >;

    /**
     * write info log
     * @param label
     * @param data
     */
    logInfo(label: string, data?: any): void;

    /**
     * write error log
     * @param label
     * @param data
     */
    logError(label: string, data?: any): void;

    /**
     * get log file path
     */
    logPath(): Promise<string>;

    /**
     * show log file
     */
    logShow(): void;

    /**
     * add launch
     * @param keyword
     * @param name
     * @param hotkey
     */
    addLaunch(
        keyword: string,
        name: string,
        hotkey: HotkeyType
    ): Promise<void>;

    /**
     * remove launch
     * @param keyword
     */
    removeLaunch(keyword: string): void;

    /**
     * activate latest window
     */
    activateLatestWindow(): Promise<void>;

    /**
     * File operations
     */
    file: {
        /**
         * Check if file or directory exists
         * @param path
         */
        exists(path: string): Promise<boolean>;
        /**
         * Read file content
         * @param path File path
         */
        read(path: string): Promise<string>;
        /**
         * Write file content
         * @param path File path
         * @param data File content
         */
        write(path: string, data: string): Promise<void>;
        /**
         * Delete file or directory
         * @param path File or directory path
         */
        remove(path: string): Promise<void>;
        /**
         * Get file extension
         */
        ext(path: string): Promise<string>;
    };

    /**
     * Database operations
     */
    db: {
        /**
         * Add document
         * @param doc
         */
        put(doc: DbDoc): DbReturn;
        /**
         * Get document
         * @param id
         */
        get<T extends {} = Record<string, any>>(id: string): DbDoc<T> | null;
        /**
         * Delete document
         * @param doc
         */
        remove(doc: string | DbDoc): DbReturn;
        /**
         * Bulk add documents
         * @param docs
         */
        bulkDocs(docs: DbDoc[]): DbReturn[];
        /**
         * Bulk get documents
         * @param key
         */
        allDocs<T extends {} = Record<string, any>>(key?: string): DbDoc<T>[];
        /**
         * Save attachment
         * @param docId
         * @param attachment
         * @param type
         */
        postAttachment(docId: string, attachment: Uint8Array, type: string): DbReturn;
        /**
         * Get attachment
         * @param docId
         */
        getAttachment(docId: string): Uint8Array | null;
        /**
         * Get attachment type
         * @param docId
         */
        getAttachmentType(docId: string): string | null;
    };

    /**
     * Local storage
     */
    dbStorage: {
        /**
         * Set storage
         * @param key
         * @param value
         */
        setItem(key: string, value: any): void;
        /**
         * Get storage
         * @param key
         */
        getItem<T = any>(key: string): T;
        /**
         * Remove storage
         * @param key
         */
        removeItem(key: string): void;
    };

    /**
     * Fast access documents
     */
    fad: {
        /**
         * Read fast access document content
         * @param type
         * @param path
         */
        read(type: string, path: string): Promise<any>;
        /**
         * Write fast access document content
         * @param type
         * @param path
         * @param data
         */
        write(type: string, path: string, data: any): Promise<void>;
    };

    /**
     * Quick panel view
     */
    view: {
        /**
         * Set height of current plugin render area in quick panel
         * @param height
         */
        setHeight(height: number): void;
        /**
         * Get height of current plugin render area in quick panel
         */
        getHeight(): Promise<number>;
    };

    /**
     * Detached window
     */
    detach: {
        /**
         * Set detached window title
         * @param title
         */
        setTitle(title: string): void;
        /**
         * set the detach window actions
         * @param operates
         */
        setOperates(
            operates: {
                name: string;
                title: string;
                click: () => void;
            }[]
        ): void;
        /**
         * Set detached window position
         * @param position
         */
        setPosition(position: "center" | "right-bottom" | "left-top" | "right-top" | "left-bottom"): void;
        /**
         * Set detached window always on top
         * @param alwaysOnTop
         */
        setAlwaysOnTop(alwaysOnTop: boolean): void;
        /**
         * Set detached window size
         */
        setSize(width: number, height: number): void;
    };

    /**
     * Utilities
     */
    util: {
        /**
         * Generate random string
         * @param length
         */
        randomString(length: number): string;
        /**
         * Convert Buffer to Base64
         * @param buffer
         */
        bufferToBase64(buffer: Uint8Array): string;
        /**
         * Convert Base64 to Buffer
         */
        base64ToBuffer(base64: string): Uint8Array;
        /**
         * Get current timestamp string
         */
        datetimeString(): string;
        /**
         * Convert data to Base64
         * @param data
         */
        base64Encode(data: any): string;
        /**
         * Convert Base64 to data
         * @param data
         */
        base64Decode(data: string): any;
        /**
         * MD5 hash
         * @param data
         */
        md5(data: string): string;
        /**
         * Save file
         * @param filename
         * @param data
         * @param option
         */
        save(
            filename: string,
            data: string | Uint8Array,
            option?: {
                isBase64?: boolean;
            }
        ): boolean;
    };
}

declare var focusany: FocusAnyApi;
