import {ActionTypeEnum, PluginRecord} from "../../../../../src/types/Manager";
import {SystemIcons} from "../asset/icon";


export const SystemPlugin: PluginRecord = {
    name: 'system',
    title: '系统设置',
    version: '1.0.0',
    logo: SystemIcons.pluginSystem,
    description: '提供基础系统功能',
    main: '<root>/page/system.html',
    preload: '<system>',
    actions: [
        {
            name: "page-data",
            title: "数据中心",
            type: ActionTypeEnum.WEB,
            icon: SystemIcons.database,
            matches: [
                '数据中心', 'data'
            ] as any
        },
        {
            name: "page-setting",
            title: "功能设置",
            type: ActionTypeEnum.WEB,
            icon: SystemIcons.pluginSystem,
            matches: [
                '功能设置', 'setting'
            ] as any
        },
        {
            name: "page-plugin",
            title: "插件管理",
            type: ActionTypeEnum.WEB,
            icon: SystemIcons.plugin,
            matches: [
                '插件管理', 'plugin'
            ] as any
        },
        {
            name: "page-action",
            title: "指令管理",
            type: ActionTypeEnum.WEB,
            icon: SystemIcons.command,
            matches: [
                '指令管理', 'action'
            ] as any
        },
        {
            name: "page-file",
            title: "文件启动",
            type: ActionTypeEnum.WEB,
            icon: SystemIcons.folder,
            matches: [
                '文件启动', 'file'
            ] as any
        },
        {
            name: "page-launch",
            title: "快捷启动",
            type: ActionTypeEnum.WEB,
            icon: SystemIcons.thunder,
            matches: [
                '快捷启动', 'launch'
            ] as any
        },
        {
            name: 'page-about',
            title: "关于我们",
            type: ActionTypeEnum.WEB,
            icon: SystemIcons.about,
            matches: [
                '关于我们', 'about',
            ] as any
        },
        {
            name: 'screenshot',
            title: "截图",
            type: ActionTypeEnum.CODE,
            icon: SystemIcons.screenshot,
            matches: [
                '截图', 'screenshot', 'snapshot'
            ] as any
        },
        {
            name: 'guide',
            title: "新手指引",
            type: ActionTypeEnum.CODE,
            icon: SystemIcons.guide,
            matches: [
                '新手指引', 'guide'
            ] as any
        },
        {
            name: 'lock',
            title: "锁屏",
            type: ActionTypeEnum.CODE,
            icon: SystemIcons.lock,
            matches: [
                '锁屏', 'lock'
            ] as any
        },
        {
            name: 'ip',
            title: "局域网IP",
            type: ActionTypeEnum.CODE,
            icon: SystemIcons.ip,
            matches: [
                'IP',
            ] as any
        }
    ]
}
