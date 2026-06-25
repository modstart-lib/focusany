/**
 * 渲染进程事件总线
 * - 桥接主进程广播的系统事件到 GlobalEvent
 * - 提供统一的 on/off/emit API，前端各处无缝使用
 */
import { GlobalEvent } from '../lib/event'
import type { SystemEventCallback, SystemEventMessage, SystemEventNameType, SystemEventPayloads } from './eventTypes'
import { SystemEventName } from './eventTypes'

type GenericCallback = (...args: any[]) => void

let initialized = false

function init() {
    if (initialized) return
    initialized = true

    // 监听主进程广播的 SystemEvent 消息，转发到 GlobalEvent
    window.__page.onBroadcast('SystemEvent', (msg: SystemEventMessage) => {
        const { name, args } = msg
        GlobalEvent.emit(name, args)
    })
}

/**
 * 订阅系统事件
 * @param event 事件名称
 * @param callback 回调函数
 */
function on<T extends SystemEventNameType>(event: T, callback: SystemEventCallback<T>): void
function on(event: string, callback: GenericCallback): void {
    GlobalEvent.on(event, callback)
}

/**
 * 一次性订阅系统事件
 */
function once<T extends SystemEventNameType>(event: T, callback: SystemEventCallback<T>): void
function once(event: string, callback: GenericCallback): void {
    GlobalEvent.once(event, callback)
}

/**
 * 取消订阅系统事件
 */
function off<T extends SystemEventNameType>(event: T, callback: SystemEventCallback<T>): void
function off(event: string, callback: GenericCallback): void {
    GlobalEvent.off(event, callback)
}

/**
 * 发射系统事件（仅渲染进程本地，不会广播到主进程）
 */
function emit<T extends SystemEventNameType>(event: T, payload: SystemEventPayloads[T]): void
function emit(event: string, ...args: any[]): void {
    GlobalEvent.emit(event, ...args)
}

export const eventBus = {
    init,
    on,
    once,
    off,
    emit,
    SystemEventName,
}

export { SystemEventName }

export type { SystemEventNameType, SystemEventPayloads, SystemEventCallback, SystemEventMessage }
