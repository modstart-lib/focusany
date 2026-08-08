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
import { PluginType } from '../../../src/types/Manager'

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
