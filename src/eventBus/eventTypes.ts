/**
 * 系统事件类型定义
 * 共享于主进程和渲染进程，保证事件名称和载荷类型一致
 */

export const SystemEventName = {
    /** 系统启动完成 */
    SYSTEM_STARTED: 'system:started',
    /** 插件安装完成 */
    PLUGIN_INSTALLED: 'plugin:installed',
    /** 插件卸载完成 */
    PLUGIN_UNINSTALLED: 'plugin:uninstalled',
} as const

export type SystemEventNameType = (typeof SystemEventName)[keyof typeof SystemEventName]

export interface SystemEventPayloads {
    'system:started': {
        timestamp: number
    }
    'plugin:installed': {
        name: string
        version: string
    }
    'plugin:uninstalled': {
        name: string
    }
}

export type SystemEventCallback<T extends SystemEventNameType = SystemEventNameType> = (
    payload: SystemEventPayloads[T],
) => void

/** 主进程广播到渲染进程使用的系统事件包装类型 */
export interface SystemEventMessage {
    name: SystemEventNameType
    args: any
}
