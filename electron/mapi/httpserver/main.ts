import type { Request, Response } from 'express'
import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { AppEnv } from '../env'
import { Log } from '../log/main'
import { Manager } from '../manager/manager'
import { ManagerPlugin } from '../manager/plugin'
import { ManagerWindow } from '../manager/window'
import { ManagerPluginStore } from '../manager/system/plugin/store/index'
import { PluginType } from '../../../src/types/Manager'
import { listModels } from '../manager/plugin/llm'
import { ImportUtil } from '../../lib/util'
import { PluginSdkCreate } from '../manager/plugin/sdk'

let server: http.Server | null = null
let isRunning = false
let runningPort = 0
let runningToken = ''

const getAvailablePort = (): Promise<number> => {
    return new Promise((resolve, reject) => {
        const s = http.createServer()
        s.listen(0, '127.0.0.1', () => {
            const addr = s.address() as { port: number }
            const port = addr.port
            s.close(() => resolve(port))
        })
        s.on('error', reject)
    })
}

const generateToken = (): string => {
    return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

const writeCliAuthFile = (port: number, token: string): void => {
    try {
        const filePath = path.join(AppEnv.dataRoot, 'cli-auth.json')
        const dir = path.dirname(filePath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(filePath, JSON.stringify({ port, token }), 'utf-8')
    } catch (e) {
        Log.error('httpserver.writeCliAuthFile.error', e)
    }
}

const sendJson = (res: Response, statusCode: number, data: any) => {
    res.status(statusCode).json(data)
}

/** JSON 安全序列化：函数→"[Function]"，undefined→null，循环引用→"[Circular]" */
const toJSONSafe = (v: any) => {
    try {
        return JSON.parse(
            JSON.stringify(v, (k, val) => {
                if (typeof val === 'function') return '[Function]'
                if (typeof val === 'undefined') return null
                return val
            }),
        )
    } catch {
        return '[Circular]'
    }
}

const createApp = (port: number, token: string) => {
    const app = express()
    app.use(express.json())
    app.use((_req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        if (_req.method === 'OPTIONS') {
            res.status(200).end()
            return
        }
        next()
    })

    app.use((_req, res, next) => {
        const auth = _req.headers['authorization'] || ''
        if (!auth.startsWith('Bearer ') || auth.slice(7) !== token) {
            sendJson(res, 401, { code: -1, msg: 'Unauthorized' })
            return
        }
        next()
    })

    app.get('/api/plugin/list', async (_req: Request, res: Response) => {
        try {
            const plugins = await Manager.listPlugin()
            const list = plugins.map((p) => ({
                name: p.name,
                title: p.title,
                version: p.version,
                logo: p.logo,
                type: p.type,
                description: p.description || '',
            }))
            sendJson(res, 200, { code: 0, data: { list } })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    app.get('/api/plugin/info', async (req: Request, res: Response) => {
        try {
            const name = String(req.query.name || '')
            if (!name) {
                sendJson(res, 400, { code: -1, msg: 'missing name' })
                return
            }
            const plugin = await Manager.getPlugin(name)
            if (!plugin) {
                sendJson(res, 404, { code: -1, msg: `PluginNotExists:${name}` })
                return
            }
            const runtime = plugin.runtime as Record<string, unknown> | undefined
            sendJson(res, 200, {
                code: 0,
                data: {
                    name: plugin.name,
                    title: plugin.title,
                    version: plugin.version,
                    logo: plugin.logo,
                    type: plugin.type,
                    description: plugin.description || '',
                    main: plugin.main,
                    preload: plugin.preload || '',
                    developmentEnv: plugin.development?.env || 'prod',
                    actions: (plugin.actions || []).map((a: any) => ({
                        name: a.name,
                        title: a.title,
                        type: a.type,
                    })),
                    mcpTools: (plugin.mcp?.tools || []).map((t: any) => t.name),
                    root: runtime?.root || null,
                },
            })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    // body: { path: string, type?: 'dir' | 'zip' }
    app.post('/api/plugin/install', async (req: Request, res: Response) => {
        try {
            const fileOrPath = String(req.body?.path || '')
            if (!fileOrPath) {
                sendJson(res, 400, { code: -1, msg: 'missing path' })
                return
            }
            const type = req.body?.type === 'zip' ? PluginType.ZIP : PluginType.DIR
            await ManagerPlugin.installFromFileOrDir(fileOrPath, type)
            sendJson(res, 200, { code: 0, data: { path: fileOrPath, type } })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    // body: { name: string }
    app.post('/api/plugin/uninstall', async (req: Request, res: Response) => {
        try {
            const name = String(req.body?.name || '')
            if (!name) {
                sendJson(res, 400, { code: -1, msg: 'missing name' })
                return
            }
            await ManagerPlugin.uninstall(name)
            sendJson(res, 200, { code: 0, data: { name } })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    app.get('/api/llm/models', async (_req: Request, res: Response) => {
        try {
            const models = await listModels()
            sendJson(res, 200, { code: 0, data: { list: models } })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    // body: { name: string, mode?: 'composite' | 'content' } → capture the
    // plugin's current window. 'composite' (default) = shell + BrowserView
    // merged (traffic-light title bar); 'content' = raw webContents capture.
    app.post('/api/plugin/capture', async (req: Request, res: Response) => {
        try {
            const name = String(req.body?.name || '')
            if (!name) {
                sendJson(res, 400, { code: -1, msg: 'missing name' })
                return
            }
            const mode = req.body?.mode === 'content' ? 'content' : 'composite'
            const shot = await ManagerWindow.capture(name, mode)
            sendJson(res, 200, {
                code: 0,
                data: {
                    name,
                    type: shot.type,
                    base64: shot.base64,
                    state: shot.state,
                    debug: (shot as any).debug,
                },
            })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    // body: { name: string, script: string } → execute JS in the plugin's
    // current window and return the (JSON-safe) result. Script must be an
    // expression; errors inside the page are surfaced as PluginEvalScriptError.
    app.post('/api/plugin/eval', async (req: Request, res: Response) => {
        try {
            const name = String(req.body?.name || '')
            const script = String(req.body?.script || '')
            if (!name || !script) {
                sendJson(res, 400, { code: -1, msg: 'missing name or script' })
                return
            }
            const result = await ManagerWindow.eval(name, script)
            sendJson(res, 200, { code: 0, data: { name, type: result.type, result: toJSONSafe(result.result) } })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    // body: { name?: string } → list open windows/views of plugin(s)
    app.post('/api/plugin/window-list', async (req: Request, res: Response) => {
        try {
            const name = req.body?.name ? String(req.body.name) : undefined
            const list = await ManagerWindow.listWindows(name)
            sendJson(res, 200, { code: 0, data: { list } })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    // body: { name: string } → close all windows/views of a plugin
    app.post('/api/plugin/close', async (req: Request, res: Response) => {
        try {
            const name = String(req.body?.name || '')
            if (!name) {
                sendJson(res, 400, { code: -1, msg: 'missing name' })
                return
            }
            const result = await ManagerWindow.closePluginWindows(name)
            sendJson(res, 200, { code: 0, data: { name, closed: result.closed } })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    // body: { name: string, event: string, data?: any } → call a backend.cjs
    // event handler directly (same channel as the frontend sendBackendEvent,
    // but headless — no plugin window required). Errors propagate.
    app.post('/api/plugin/event', async (req: Request, res: Response) => {
        try {
            const name = String(req.body?.name || '')
            const event = String(req.body?.event || '')
            if (!name || !event) {
                sendJson(res, 400, { code: -1, msg: 'missing name or event' })
                return
            }
            const plugin = await Manager.getPlugin(name)
            if (!plugin) {
                sendJson(res, 404, { code: -1, msg: `PluginNotExists:${name}` })
                return
            }
            const root = (plugin.runtime as Record<string, unknown> | undefined)?.root
            if (!root) {
                sendJson(res, 500, { code: -1, msg: `PluginRootNotFound:${name}` })
                return
            }
            const backendPath = path.join(root as string, 'backend.cjs')
            if (!fs.existsSync(backendPath)) {
                sendJson(res, 500, { code: -1, msg: `BackendFileNotFound:${backendPath}` })
                return
            }
            const backend = await ImportUtil.loadCommonJs(backendPath)
            const handler = backend?.event?.[event]
            if (typeof handler !== 'function') {
                sendJson(res, 500, { code: -1, msg: `BackendEventNotFound:${name}.${event}` })
                return
            }
            const sdk = PluginSdkCreate(plugin)
            const result = await handler(sdk, req.body?.data)
            sendJson(res, 200, { code: 0, data: { name, event, result: toJSONSafe(result) } })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    // body: { name: string, version?: string } → package the plugin and upload
    // to the official store via UserApi (store/plugin_publish). Reuses the
    // desktop app's own publish implementation (ManagerPluginStore.publish):
    // reads release.md, zips the plugin dir, posts with Api-Token auth.
    app.post('/api/plugin/publish', async (req: Request, res: Response) => {
        try {
            const name = String(req.body?.name || '')
            if (!name) {
                sendJson(res, 400, { code: -1, msg: 'missing name' })
                return
            }
            const version = req.body?.version ? String(req.body.version) : undefined
            const result = await ManagerPluginStore.publish(name, { version })
            sendJson(res, 200, { code: 0, data: result })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    // body: { name: string, version?: string } → update plugin info (content/
    // preview) on the store without publishing a new package.
    app.post('/api/plugin/publish-info', async (req: Request, res: Response) => {
        try {
            const name = String(req.body?.name || '')
            if (!name) {
                sendJson(res, 400, { code: -1, msg: 'missing name' })
                return
            }
            const version = req.body?.version ? String(req.body.version) : undefined
            const result = await ManagerPluginStore.publishInfo(name, { version })
            sendJson(res, 200, { code: 0, data: result })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    // body: { name: string, actionName?: string, files?: string[] }
    app.post('/api/plugin/run', async (req: Request, res: Response) => {
        try {
            const name = String(req.body?.name || '')
            if (!name) {
                sendJson(res, 400, { code: -1, msg: 'missing name' })
                return
            }
            const plugin = await Manager.getPlugin(name)
            if (!plugin) {
                sendJson(res, 404, { code: -1, msg: `PluginNotExists:${name}` })
                return
            }
            const actionName = req.body?.actionName ? String(req.body.actionName) : ''
            let target = null
            if (actionName) {
                target = (plugin.actions || []).find((a) => a.name === actionName) || null
                if (!target) {
                    sendJson(res, 404, { code: -1, msg: `ActionNotExists:${name}/${actionName}` })
                    return
                }
            } else {
                target = (plugin.actions || []).find((a) => a.type === 'web') || (plugin.actions || [])[0] || null
                if (!target) {
                    sendJson(res, 404, { code: -1, msg: `PluginNoActions:${name}` })
                    return
                }
            }
            ;(target as any).pluginName = name

            // Optional files (paths) are handed to the plugin's preload as
            // actionMatchFiles — the same channel the search box uses when the
            // user selects files. This lets the CLI drive file-open actions
            // (e.g. bento opening a .bento.html) without GUI interaction.
            const files: string[] = Array.isArray(req.body?.files) ? req.body.files.map(String) : []
            if (files.length > 0) {
                const matchFiles = files.map((p) => ({
                    name: path.basename(p),
                    path: p,
                    isFile: true,
                    isDirectory: false,
                    fileExt: path.extname(p).replace(/^\./, ''),
                }))
                ;(target as any).runtime = { ...((target as any).runtime || {}), matchFiles }
                await ManagerWindow.open(plugin, target)
            } else {
                await Manager.openAction(target)
            }
            sendJson(res, 200, { code: 0, data: { name, action: target.name, files } })
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) })
        }
    })

    return app
}

export const HttpServer = {
    async start() {
        if (isRunning) {
            return
        }
        try {
            const port = await getAvailablePort()
            const token = generateToken()
            const app = createApp(port, token)
            server = http.createServer(app)
            await new Promise<void>((resolve, reject) => {
                server!.listen(port, '127.0.0.1', () => resolve())
                server!.on('error', reject)
            })
            runningPort = port
            runningToken = token
            isRunning = true
            writeCliAuthFile(port, token)
            Log.info('httpserver.start', { port })
        } catch (e) {
            Log.error('httpserver.start.error', e)
        }
    },

    stop() {
        if (server) {
            server.close()
            server = null
            isRunning = false
            runningPort = 0
            runningToken = ''
        }
    },

    getPort() {
        return runningPort
    },

    getToken() {
        return runningToken
    },
}
