/**
 * ManagerDebug — 插件调试数据采集器
 *
 * 通过 Electron 原生机制采集调试数据：
 *  - viewError: webContents.on('console-message') 监听 console.error
 *  - externalRequest: session.webRequest.onBeforeRequest 拦截外网请求
 *  - mainError: 日志文件增量读取
 *
 * 通过 /api/debug?type=xxx&plugin=xxx&param=xxx 供测试框架消费。
 * 消费后自动清除（增量模式）。
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

// ═════════════════════════════════════════════════════════════════
//  类型
// ═════════════════════════════════════════════════════════════════

type DebugBuffer = {
    viewErrors: string[]
    externalRequests: string[]
}

// ═════════════════════════════════════════════════════════════════
//  状态
// ═════════════════════════════════════════════════════════════════

const _buffers: Record<string, DebugBuffer> = {}

function getBuffer(plugin: string): DebugBuffer {
    if (!_buffers[plugin]) {
        _buffers[plugin] = { viewErrors: [], externalRequests: [] }
    }
    return _buffers[plugin]
}

// ═════════════════════════════════════════════════════════════════
//  视图层 console.error 采集（通过 Electron 原生 console-message 事件）
// ═════════════════════════════════════════════════════════════════

/**
 * 在插件 webContents 上监听 console-message 事件（Electron 原生，无需 JS 注入）。
 * 在 view 创建完成后调用（如 open / _logPluginViewError 中）。
 *
 * @param plugin 插件名
 * @param wc webContents 实例
 */
export function hookViewConsole(plugin: string, wc: Electron.WebContents) {
    wc.on('console-message', (_event, level, message) => {
        // level 3 = error, 2 = warning
        if (level >= 2) {
            getBuffer(plugin).viewErrors.push(`[level=${level}] ${message}`)
        }
    })
}

/**
 * pushViewError — 由 _logPluginViewError 中 console-message 事件调用。
 */
export function pushViewError(plugin: string, msg: string) {
    getBuffer(plugin).viewErrors.push(msg)
}

/**
 * getViewErrors(plugin, param) — 获取并清空指定插件的 view console.error 列表。
 */
export function getViewErrors(plugin: string, _param?: any): string[] {
    const buf = getBuffer(plugin)
    const errors = buf.viewErrors.slice()
    buf.viewErrors.length = 0
    return errors
}

// ═════════════════════════════════════════════════════════════════
//  外网请求采集（通过 Electron session.webRequest.onBeforeRequest）
// ═════════════════════════════════════════════════════════════════

let _externalHookInitialized = false

/**
 * 初始化全局外网请求拦截（只需调用一次）。
 * 通过 session.defaultSession.webRequest.onBeforeRequest 拦截所有请求，
 * 过滤出外网（非 127.0.0.1 / localhost / 相对路径）请求并分类到插件 buffer。
 */
export function initExternalRequestHook() {
    if (_externalHookInitialized) return
    _externalHookInitialized = true

    const { session } = require('electron')
    const defaultSession = session.defaultSession
    if (!defaultSession) return

    defaultSession.webRequest.onBeforeRequest((details: any, callback: any) => {
        const url = details.url || ''
        // 只拦截外网请求
        if (!url.startsWith('http://127.0.0.1') && !url.startsWith('http://localhost') && url.startsWith('http')) {
            // 尝试从 webContents 关联的插件名分类
            // details.webContentsId 可通过 Electron webContents.fromId 获取
            try {
                const wc = require('electron').webContents.fromId(details.webContentsId)
                if (wc) {
                    // 从窗口/视图上绑定的 _plugin 属性得知插件名
                    const view = findViewByWebContents(wc)
                    if (view && view._plugin?.name) {
                        getBuffer(view._plugin.name).externalRequests.push(url)
                    }
                }
            } catch {
                /* ignore */
            }
        }
        callback({ cancel: false })
    })
}

// Electron 中根据 webContents 查找对应视图的工具函数
// 引用自 ManagerWindow 的实现，这里简化处理
function findViewByWebContents(wc: Electron.WebContents): any {
    const views = (global as any).__managerWindowViews || []
    for (const v of views) {
        try {
            if (v.webContents?.id === wc.id) return v
        } catch {
            /* ignore */
        }
    }
    return null
}

/**
 * 获取并清空指定插件的外网请求列表。
 */
export function getExternalRequests(plugin: string, _param?: any): string[] {
    const buf = getBuffer(plugin)
    const urls = buf.externalRequests.slice()
    buf.externalRequests.length = 0
    return urls
}

// ═════════════════════════════════════════════════════════════════
//  主进程错误（增量读取日志文件）
// ═════════════════════════════════════════════════════════════════

const _mainLogState: Record<string, number> = {}

export function getMainErrors(plugin: string, _param?: any): string[] {
    const dataRoot: string = (process as any).env?.FOCUSANY_DATA_ROOT || path.join(os.homedir(), '.focusany', 'data')
    const logsDir = path.join(dataRoot, 'logs')
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const logFile = path.join(logsDir, `log_${dateStr}.log`)
    const pluginLogFile = path.join(logsDir, `Plugin_${plugin}_${dateStr}.log`)

    const errors: string[] = []
    const key = plugin + ':' + dateStr

    for (const f of [logFile, pluginLogFile]) {
        try {
            if (!fs.existsSync(f)) continue
            const isPlugin = f === pluginLogFile
            const posKey = key + ':' + (isPlugin ? 'p' : 'm')
            const pos = _mainLogState[posKey] || 0
            const content = fs.readFileSync(f, 'utf-8')
            const newContent = content.slice(pos)
            if (!newContent) continue

            const lines = newContent.split('\n').filter((l) => l.includes('ERROR'))
            for (const line of lines) {
                if (line.includes(plugin) || line.includes('plugin') || line.includes('ApiError')) {
                    errors.push(line.trim())
                }
            }
            _mainLogState[posKey] = content.length
        } catch {
            /* ignore */
        }
    }

    return errors
}

// ═════════════════════════════════════════════════════════════════
//  统一导出（API 路由通过 ManagerDebug[type](plugin, param) 直接调用）
// ═════════════════════════════════════════════════════════════════

export const ManagerDebug = {
    pushViewError,
    getViewErrors,
    getExternalRequests,
    getMainErrors,
}
