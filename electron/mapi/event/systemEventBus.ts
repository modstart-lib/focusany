/**
 * 主进程系统事件总线
 * - 本地监听 + 广播到所有渲染进程
 * - 后端模块通过 on/off 监听事件
 * - 通过 Events.broadcast 将事件推送到所有前端窗口
 */
import { TinyEmitter } from 'tiny-emitter'
import { Events } from './main'
import { SystemEventName, SystemEventNameType, SystemEventPayloads } from '../../../src/eventBus/eventTypes'
import type { SystemEventCallback } from '../../../src/eventBus/eventTypes'

const emitter = new TinyEmitter()

/**
 * 发射系统事件
 * - 主进程本地监听者会收到通知
 * - 所有渲染进程窗口收到广播（通过 SystemEvent 广播类型）
 */
function emit<T extends SystemEventNameType>(event: T, payload: SystemEventPayloads[T]): void {
    // 1. 通知主进程本地监听者
    emitter.emit(event, payload)

    // 2. 广播到所有渲染进程
    Events.broadcast('SystemEvent', {
        name: event,
        args: payload,
    })
}

/**
 * 订阅系统事件（主进程本地）
 */
function on<T extends SystemEventNameType>(event: T, callback: SystemEventCallback<T>): void {
    emitter.on(event, callback)
}

/**
 * 一次性订阅系统事件（主进程本地）
 */
function once<T extends SystemEventNameType>(event: T, callback: SystemEventCallback<T>): void {
    emitter.once(event, callback)
}

/**
 * 取消订阅系统事件（主进程本地）
 */
function off<T extends SystemEventNameType>(event: T, callback: SystemEventCallback<T>): void {
    emitter.off(event, callback)
}

export const SystemEventBus = {
    emit,
    on,
    once,
    off,
    SystemEventName,
}

export { SystemEventName }
