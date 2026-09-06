import path from 'path'
import fs from 'fs'
import { Files } from '../../file/main'
import { PluginContext } from '../type'

type AssetProgress = {
    total: number
    completed: number
    percent: number
    speed: number
    status: 'downloading' | 'completed' | 'failed'
    error?: string
}

const downloadProgressMap = new Map<string, AssetProgress>()

const getKey = (pluginName: string, pluginFilePath: string) => `${pluginName}::${pluginFilePath}`

const getPluginRoot = (context: PluginContext): string | null => {
    if (context._plugin.runtime && context._plugin.runtime.root) {
        return context._plugin.runtime.root
    }
    return null
}

export const assetDownload = async (context: PluginContext, data: any): Promise<void> => {
    const { url, pluginFilePath, options } = data
    const timeout = (options?.timeout ?? 3600) * 1000

    const pluginRoot = getPluginRoot(context)
    if (!pluginRoot) {
        throw new Error('Plugin root not found')
    }

    const key = getKey(context._plugin.name, pluginFilePath)
    const targetPath = path.join(pluginRoot, pluginFilePath)
    const targetDir = path.dirname(targetPath)

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
    }

    // Download to temp file first, then move to final location
    const ext = path.extname(pluginFilePath) || 'tmp'
    const tempFile = await Files.temp(ext, 'asset-download')

    const progress: AssetProgress = {
        total: 0,
        completed: 0,
        percent: 0,
        speed: 0,
        status: 'downloading',
    }
    downloadProgressMap.set(key, progress)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { 'User-Agent': 'FocusAny' },
            signal: controller.signal,
        })

        if (!res.ok) {
            throw new Error(`DownloadError:${url}`)
        }

        const contentLength = res.headers.get('content-length')
        const totalSize = contentLength ? parseInt(contentLength, 10) : 0
        progress.total = totalSize

        const reader = res.body!.getReader()
        const fileStream = fs.createWriteStream(tempFile)

        let lastCompleted = 0
        let lastTime = Date.now()

        const pump = async () => {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                fileStream.write(value)

                const now = Date.now()
                progress.completed += value.length
                if (totalSize > 0) {
                    progress.percent = Math.round((progress.completed / totalSize) * 100)
                }
                const elapsed = (now - lastTime) / 1000
                if (elapsed > 0.1) {
                    progress.speed = Math.round((progress.completed - lastCompleted) / elapsed)
                    lastCompleted = progress.completed
                    lastTime = now
                }
            }
        }

        await pump()
        clearTimeout(timeoutId)

        await new Promise<void>((resolve, reject) => {
            fileStream.end((err) => {
                if (err) {
                    reject(err)
                    return
                }
                // Move temp file to final plugin path
                if (fs.existsSync(targetPath)) {
                    fs.unlinkSync(targetPath)
                }
                fs.renameSync(tempFile, targetPath)

                progress.status = 'completed'
                progress.percent = 100
                progress.completed = progress.total
                resolve()
            })
        })
    } catch (e: any) {
        clearTimeout(timeoutId)
        progress.status = 'failed'
        progress.error = e.message || '' + e

        // Clean up temp file on failure
        if (fs.existsSync(tempFile)) {
            try {
                fs.unlinkSync(tempFile)
            } catch (_) {
                // ignore cleanup error
            }
        }

        if (e.name === 'AbortError') {
            throw new Error('Download timeout')
        }
        throw e
    }
}

export const assetExists = async (context: PluginContext, data: any): Promise<boolean> => {
    const { pluginFilePath } = data
    const pluginRoot = getPluginRoot(context)
    if (!pluginRoot) return false

    const targetPath = path.join(pluginRoot, pluginFilePath)
    return await Files.exists(targetPath, { isDataPath: false })
}

export const assetDelete = async (context: PluginContext, data: any): Promise<void> => {
    const { pluginFilePath } = data
    const pluginRoot = getPluginRoot(context)
    if (!pluginRoot) return

    const targetPath = path.join(pluginRoot, pluginFilePath)
    await Files.deletes(targetPath, { isDataPath: false })

    // Clear progress tracking
    const key = getKey(context._plugin.name, pluginFilePath)
    downloadProgressMap.delete(key)
}

export const assetProgress = async (context: PluginContext, data: any): Promise<AssetProgress | null> => {
    const { pluginFilePath } = data
    const key = getKey(context._plugin.name, pluginFilePath)
    const progress = downloadProgressMap.get(key)
    if (!progress) return null

    return {
        total: progress.total,
        completed: progress.completed,
        percent: progress.percent,
        speed: progress.speed,
        status: progress.status,
        error: progress.error,
    }
}