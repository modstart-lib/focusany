declare interface Window {
    __page: {
        onShow: (cb: Function) => void,
        onHide: (cb: Function) => void,
        onMaximize: (cb: Function) => void,
        onUnmaximize: (cb: Function) => void,
        onEnterFullScreen: (cb: Function) => void,
        onLeaveFullScreen: (cb: Function) => void,
        onBroadcast: (type: string, cb: (data: any) => void) => void,
        offBroadcast: (type: string, cb: (data: any) => void) => void,
        registerCallPage: (
            name: string,
            cb: (
                resolve: (data: any) => void,
                reject: (error: string) => void,
                data: any
            ) => void
        ) => void,
        createChannel: (cb: (data: any) => void) => string,
        destroyChannel: (channel: string) => void,

        onPluginInit: (cb: Function) => void,
        onPluginAlreadyOpened: (cb: Function) => void,
        onPluginExit: (cb: Function) => void,
        onPluginDetached: (cb: Function) => void,
        onPluginState: (cb: Function) => void,
        onSetSubInput: (cb: Function) => void,
        onRemoveSubInput: (cb: Function) => void,
        onSetSubInputValue: (cb: Function) => void,
        onDetachSet: (cb: Function) => void,
    },
    focusany: FocusAnyApi,
    $mapi: {
        app: {
            getPreload: () => Promise<string>,
            resourcePathResolve: (filePath: string) => Promise<string>,
            extraPathResolve: (filePath: string) => Promise<string>,
            platformName: () => 'win' | 'osx' | 'linux' | null,
            platformArch: () => 'x86' | 'arm64' | null,
            isPlatform: (platform: 'win' | 'osx' | 'linux') => boolean,
            quit: () => Promise<void>,
            restart: () => Promise<void>,
            windowMin: (name?: string) => Promise<void>,
            windowMax: (name?: string) => Promise<void>,
            windowSetSize: (name: string | null, width: number, height: number, option?: {
                includeMinimumSize?: boolean,
                center?: boolean
            }) => Promise<void>,
            windowOpen: (name: string, option?: any) => Promise<void>,
            windowHide: (name?: string) => Promise<void>,
            windowClose: (name?: string) => Promise<void>,
            windowMove: (name: string | null, data: {
                mouseX: number,
                mouseY: number,
                width: number,
                height: number
            }) => Promise<void>,
            openExternalWeb: (url: string) => Promise<void>,
            appEnv: () => Promise<any>,
            setRenderAppEnv: (env: any) => Promise<void>,
            isDarkMode: () => Promise<boolean>,
            shell: (command: string, option?: {
                cwd?: string,
                outputEncoding?: string,
            }) => Promise<void>,
            spawnShell: (command: string | string[], option: {
                stdout?: (data: string, process: any) => void,
                stderr?: (data: string, process: any) => void,
                success?: (process: any) => void,
                error?: (msg: string, exitCode: number, process: any) => void,
                cwd?: string,
                outputEncoding?: string,
                env?: Record<string, any>,
            } | null) => Promise<{
                stop: () => void,
                send: (data: any) => void,
                result: () => Promise<string>
            }>,
            availablePort: (start: number, lockKey?: string, lockTime?: number) => Promise<number>,
            fixExecutable: (executable: string) => Promise<void>,
            getClipboardText: () => Promise<string>,
            setClipboardText: (text: string) => Promise<void>,
            getClipboardImage: () => Promise<string>,
            setClipboardImage: (image: string) => Promise<void>,
            getUserAgent: () => string,
            toast: (msg: string, option?: {
                duration?: number,
                status?: 'success' | 'error'
            }) => Promise<void>,
            setupList: () => Promise<{
                name: string,
                title: string,
                status: 'success' | 'fail',
                desc: string,
                steps: {
                    title: string,
                    image: string,
                }[]
            }[]>,
            setupOpen: (name: string) => Promise<void>,
            setupIsOk: () => Promise<boolean>,
            getBuildInfo: () => Promise<{
                buildTime: string,
            }>,
            collect: (options?: {}) => Promise<any>,
        },
        config: {
            get: (key: string, defaultValue: any = null) => Promise<any>,
            set: (key: string, value: any) => Promise<void>,
            all: () => Promise<any>,
            getEnv: (key: string, defaultValue: any = null) => Promise<any>,
            setEnv: (key: string, value: any) => Promise<void>,
            allEnv: () => Promise<any>,
        },
        log: {
            root: () => string,
            info: (msg: string, data: any = null) => Promise<void>,
            error: (msg: string, data: any = null) => Promise<void>,
            collect: (option?: {
                startTime?: string,
                endTime?: string,
                limit?: number,
            }) => Promise<string>,
        },
        storage: {
            all: () => Promise<any>,
            get: (group: string, key: string, defaultValue: any) => Promise<any>,
            set: (group: string, key: string, value: any) => Promise<void>,
        },
        db: {
            execute: (sql: string, params: any = []) => Promise<any>,
            insert: (sql: string, params: any = []) => Promise<any>,
            first: (sql: string, params: any = []) => Promise<any>,
            select: (sql: string, params: any = []) => Promise<any>,
            update: (sql: string, params: any = []) => Promise<any>,
            delete: (sql: string, params: any = []) => Promise<any>,
        },
        kvdb: {
            put: (name: string, data: Doc<any>) => Promise<any>,
            putForce: (name: string, data: Doc<any>) => Promise<any>,
            get: (name: string, id: string) => Promise<any>,
            remove: (name: string, doc: Doc<any> | string) => Promise<any>,
            bulkDocs: (name: string, docs: any[]) => Promise<any>,
            allDocs: (name: string, key: string) => Promise<any>,
            allKeys: (name: string, key: string) => Promise<string[]>,
            count: (name: string, key: string) => Promise<any>,
            postAttachment: (name: string, docId: string, attachment: any, type: string) => Promise<any>,
            getAttachment: (name: string, docId: string) => Promise<any>,
            getAttachmentType: (name: string, docId: string) => Promise<any>,
            dumpToFile: (file: string) => Promise<void>,
            importFromFile: (file: string) => Promise<void>,
            testWebdav: (option: {
                url: string,
                username: string,
                password: string,
            }) => Promise<void>,
            dumpToWebDav: (file: string, option: {
                url: string,
                username: string,
                password: string
            }) => Promise<void>,
            importFromWebDav: (file: string, option: {
                url: string,
                username: string,
                password: string
            }) => Promise<void>,
            listWebDav: (dir: string, option: {
                url: string,
                username: string,
                password: string
            }) => Promise<any[]>,
        },
        file: {
            fullPath: (path: string) => Promise<string>,
            absolutePath: (path: string) => string,
            exists: (path: string, option?: { isFullPath?: boolean, }) => Promise<boolean>,
            isDirectory: (path: string, option?: { isFullPath?: boolean, }) => Promise<boolean>,
            mkdir: (path: string, option?: { isFullPath?: boolean, }) => Promise<void>,
            list: (path: string, option?: { isFullPath?: boolean, }) => Promise<any[]>,
            listAll: (path: string, option?: { isFullPath?: boolean, }) => Promise<any[]>,
            write: (path: string, data: any, option?: { isFullPath?: boolean, }) => Promise<void>,
            writeBuffer: (path: string, data: any, option?: { isFullPath?: boolean, }) => Promise<void>,
            read: (path: string, option?: { isFullPath?: boolean, }) => Promise<any>,
            readBuffer: (path: string, option?: { isFullPath?: boolean, }) => Promise<any>,
            deletes: (path: string, option?: { isFullPath?: boolean, }) => Promise<void>,
            rename: (pathOld: string, pathNew: string, option?: {
                isFullPath?: boolean,
                overwrite?: boolean
            }) => Promise<void>,
            copy: (pathOld: string, pathNew: string, option?: { isFullPath?: boolean, }) => Promise<void>,
            temp: (ext: string = 'tmp', prefix: string = 'file') => Promise<string>,
            tempDir: (prefix: string = 'dir') => Promise<string>,
            watchText: (path: string, callback: (data: {}) => void, option?: {
                isFullPath?: boolean,
                limit?: number,
            }) => Promise<{
                stop: Function,
            }>,
            appendText: (path: string, data: any, option?: { isFullPath?: boolean, }) => Promise<void>,
            openFile: (options: {} = {}) => Promise<any>,
            openDirectory: (options: {} = {}) => Promise<any>,
            openSave: (options: {} = {}) => Promise<any>,
            openPath: (path: string, options: {} = {}) => Promise<void>,
        },
        updater: {
            checkForUpdate: () => Promise<ApiResult<any>>,
        },
        statistics: {
            tick: (name: string, data: any = null) => Promise<void>,
        },
        lang: {
            writeSourceKey: (key: string) => Promise<void>,
            writeSourceKeyUse: (key: string) => Promise<void>,
        },
        event: {
            send: (name: string, type: string, data: any) => void,
            callPage: (name: string, type: string, data?: any, option?: {
                waitReadyTimeout?: number,
                timeout?: number
            }) => Promise<ApiResult<any>>,
            channelSend: (channel: string, data: any) => Promise<void>,
        },
        user: {
            open: (option?: any) => Promise<void>,
            get: () => Promise<{
                apiToken: string,
                user: {
                    id: string,
                    name: string,
                    avatar: string,
                },
                data: {},
                basic: {},
            }>,
            refresh: () => Promise<void>,
            getApiToken: () => Promise<string>,
            getWebEnterUrl: (url: string) => Promise<string>,
            openWebUrl: (url: string) => Promise<void>,
            apiPost: (url: string, data?: any) => Promise<any>,
        },
        misc: {
            getZipFileContent: (path: string, pathInZip: string) => Promise<string>,
            unzip: (zipPath: string, dest: string, option?: { process: Function }) => Promise<void>,
        },

        ffmpeg: {
            version: () => Promise<string>,
            run: (args: string[]) => Promise<string>,
        },
        server: {
            start: (serverInfo: ServerInfo) => Promise<void>,
            ping: (serverInfo: ServerInfo) => Promise<boolean>,
            stop: (serverInfo: ServerInfo) => Promise<void>,
            config: (serverInfo: ServerInfo) => Promise<any>,
            callFunction: (serverInfo: ServerInfo, method: string, data: any) => Promise<any>,
        },
        manager: {

            getConfig: () => Promise<ConfigRecord>,
            setConfig: (config: ConfigRecord) => Promise<void>,

            show: () => Promise<void>,
            hide: () => Promise<void>,

            getClipboardFiles: () => Promise<any[]>,
            getSelectedContent: () => Promise<SelectedContent>,

            searchFastPanelAction: (query: {
                currentFiles: any[],
                currentImage: string,
            }, option?: {}) => Promise<{
                searchActions: ActionRecord[],
            }>,
            searchAction: (query: {
                keywords: string,
                currentFiles: any[],
                currentImage: string,
            }, option?: {}) => Promise<{
                searchActions: ActionRecord[],
                matchActions: ActionRecord[],
                historyActions: ActionRecord[],
                pinActions: ActionRecord[],
            }>,
            subInputChange: (keywords: string, option?: {}) => void,

            openPlugin: (pluginName: string, option?: {}) => Promise<void>,
            openAction: (action: ActionRecord, option?: {}) => Promise<void>,

            closeMainPlugin: (plugin?: PluginRecord, option?: {}) => Promise<void>,
            openMainPluginDevTools: (plugin?: PluginRecord, option?: {}) => Promise<void>,
            detachPlugin: (option?: {}) => Promise<void>,
            listPlugin: (option?: {}) => Promise<PluginRecord[]>,
            installPlugin: (fileOrPath: string, option?: {}) => Promise<void>,
            refreshInstallPlugin: (pluginName: string, option?: {}) => Promise<void>,
            uninstallPlugin: (pluginName: string, option?: {}) => Promise<void>,
            getPluginInstalledVersion: (pluginName: string, option?: {}) => Promise<boolean>,
            listDisabledActionMatch: (option?: {}) => Promise<any>,
            toggleDisabledActionMatch: (pluginName: string, actionName: string, matchName: string, option?: {}) => Promise<boolean>,
            listPinAction: (option?: {}) => Promise<any>,
            togglePinAction: (pluginName: string, actionName: string, option?: {}) => Promise<boolean>,
            clearCache: (option?: {}) => Promise<void>,
            hotKeyWatch: (option?: {}) => Promise<void>,
            hotKeyUnwatch: (option?: {}) => Promise<void>,

            toggleDetachPluginAlwaysOnTop: (alwaysOnTop: boolean, option?: {}) => Promise<boolean>,
            setDetachPluginZoom: (zoom: number, option?: {}) => Promise<void>,
            closeDetachPlugin: (option?: {}) => Promise<void>,
            openDetachPluginDevTools: (option?: {}) => Promise<void>,
            setPluginAutoDetach: (autoDetach: boolean, option?: {}) => Promise<void>,
            getPluginConfig: (pluginName: string, option?: {}) => Promise<PluginConfig>,

            listFilePluginRecords: (option?: {}) => Promise<FilePluginRecord[]>,
            updateFilePluginRecords: (records: FilePluginRecord[], option?: {}) => Promise<void>,
            listLaunchRecords: (option?: {}) => Promise<LaunchRecord[]>,
            updateLaunchRecords: (records: LaunchRecord[], option?: {}) => Promise<void>,

            storeInstall: (pluginName: string, option?: {
                version?: string,
            }) => Promise<void>,
            storePublish: (pluginName: string, option?: {
                version?: string,
            }) => Promise<void>,
            storePublishInfo: (pluginName: string, option?: {
                version?: string,
            }) => Promise<void>,

            clipboardList: (option?: {}) => Promise<ClipboardHistoryRecord[]>,
            clipboardClear: (option?: {}) => Promise<void>,
            clipboardDelete: (timestamp: number, option?: {}) => Promise<void>,

            historyClear: (option?: {}) => Promise<void>,
            historyDelete: (pluginName: string, actionName: string, option?: {}) => Promise<void>,

        }
    }
}


