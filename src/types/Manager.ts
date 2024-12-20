import {HotkeyKeyItem, HotkeyKeySimpleItem,} from "../../electron/mapi/keys/type";

export type ConfigRecord = {
    mainTrigger: HotkeyKeyItem,
    fastPanelTrigger: HotkeyKeySimpleItem,
}

export type PluginConfig = {
    autoDetach: boolean,
    zoom: number,
}

export enum PluginType {
    SYSTEM = 'system',
    STORE = 'store',
    ZIP = 'zip',
    DIR = 'dir',
}

export enum PluginEnv {
    DEV = 'dev',
    PROD = 'prod',
}

export type PluginRecord = {
    // 以下配置信息和原始的 config.json 一致，未经过处理
    name: string,
    title: string,
    version: string,
    logo: string,
    main: string,
    mainFastPanel?: string,
    actions: ActionRecord[],
    description?: string,
    preload?: string,
    platform?: PlatformType[],
    versionRequire?: string,
    author?: string,
    homepage?: string,
    setting?: {
        autoDetach?: boolean,
        width?: string,
        height?: string,
        singleton?: boolean,
        zoom?: number,
        preloadBase?: string,
        nodeIntegration?: boolean,
    },
    development?: {
        env?: 'dev' | 'prod',
        main?: string,
        mainFastPanel?: string,
        keepCodeDevTools?: boolean,
        showFastPanelDevTools?: boolean,
    },

    type?: PluginType,
    env?: PluginEnv,
    runtime?: {
        // 插件运行的根目录
        root?: string | null,
        // 配置信息
        config?: PluginConfig,
    },
}

export type PluginState = {
    value: string
    placeholder: string
}

export type ActionMatch = (
    ActionMatchText
    | ActionMatchKey
    | ActionMatchRegex
    | ActionMatchFile
    | ActionMatchImage
    | ActionMatchWindow
    | ActionMatchEditor
    )

export enum ActionMatchTypeEnum {
    TEXT = 'text',
    KEY = 'key',
    REGEX = 'regex',
    IMAGE = 'image',
    FILE = 'file',
    WINDOW = 'window',
    EDITOR = 'editor',
}

export type ActionMatchBase = {
    type: ActionMatchTypeEnum,
    name?: string,
}

export type ActionMatchText = ActionMatchBase & {
    text: string,
    minLength: number,
    maxLength: number,
}

export type ActionMatchKey = ActionMatchBase & {
    key: string,
}

export type ActionMatchRegex = ActionMatchBase & {
    regex: string,
    title: string,
    minLength: number,
    maxLength: number,
}

export type ActionMatchFile = ActionMatchBase & {
    title: string,
    minCount: number,
    maxCount: number,
    filterFileType: 'file' | 'directory',
    filterExtensions: string[],
}

export type ActionMatchImage = ActionMatchBase & {
    title: string,
}

export type ActionMatchWindow = ActionMatchBase & {
    nameRegex: string,
    titleRegex: string,
    attrRegex: Record<string, string>,
}

export type ActionMatchEditor = ActionMatchBase & {
    extensions: string[],
    faDataTypes: string[],
}

export type SelectedContent = {
    type: 'file' | 'image' | 'text',
    files?: FileItem[],
    image?: string,
    text?: string
}

export type ActiveWindow = {
    name: string,
    title: string,
    attr: Record<string, string>
}

export type ClipboardDataType = {
    type: 'file' | 'image' | 'text',
    files?: FileItem[],
    image?: string,
    text?: string
}

export type ClipboardHistoryRecord = {
    type: 'file' | 'image' | 'text',
    timestamp: number,
    files?: FileItem[],
    image?: string,
    text?: string,
}

export type ActionRecord = {
    fullName?: string,
    pluginName?: string,
    name: string,
    title: string,
    matches: ActionMatch[],
    pluginType?: PluginType,
    platform?: PlatformType[],
    icon?: string,
    data?: {
        command?: string
    },

    type?: ActionTypeEnum,
    runtime?: {
        searchScore?: number,
        searchTitleMatched?: string,
        match?: ActionMatch | null,
        requestId?: string | null,
        view?: any,
        matchFiles?: FileItem[],
    },
}

export type PluginActionRecord = {
    pluginName: string,
    actionName: string,
}

export type ActionTypeCodeData = {
    actionName: string,
}

export enum ActionTypeEnum {
    COMMAND = 'command',
    WEB = 'web',
    CODE = 'code',
    BACKEND = 'backend',
    VIEW = 'view',
}


export type FilePluginRecord = {
    icon: string,
    title: string,
    path: string,
}

export type LaunchRecord = {
    hotkey: HotkeyKeyItem
    keyword: string
}
