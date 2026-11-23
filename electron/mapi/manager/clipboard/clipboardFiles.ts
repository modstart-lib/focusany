import { clipboard, ClipboardItem } from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

// Electron 44+ maps the `text/uri-list` MIME type to the native file-reference
// format of every platform (NSFilenamesPboardType / CF_HDROP / text/uri-list),
// so file clipboard read and write no longer need per-platform implementations.
export const getClipboardFiles = async (): Promise<FileItem[]> => {
    if (!(await clipboard.has('text/uri-list'))) {
        return []
    }
    let content = ''
    try {
        const items = await clipboard.read()
        for (const item of items) {
            if (!item.types.includes('text/uri-list')) {
                continue
            }
            content = await (await item.getType('text/uri-list')).text()
            break
        }
    } catch (e) {
        return []
    }
    const uris = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
    const target: any = uris
        .map((uri) => {
            let p: string
            try {
                p = fileURLToPath(uri)
            } catch (e) {
                return false
            }
            if (!fs.existsSync(p)) return false
            let info
            try {
                info = fs.lstatSync(p)
            } catch (e) {
                return false
            }
            let fileExt = null
            if (info.isFile()) {
                fileExt = path.extname(p).toLowerCase().replace(/^./, '')
            }
            return {
                isFile: info.isFile(),
                isDirectory: info.isDirectory(),
                name: path.basename(p) || p,
                path: p,
                fileExt: fileExt,
            }
        })
        .filter(Boolean)
    return target.length ? target : []
}

export const setClipboardFiles = async (files: string[]): Promise<void> => {
    if (!files || !files.length) {
        return
    }
    const uris = files.map((file) => pathToFileURL(file).toString())
    await clipboard.write([new ClipboardItem({ 'text/uri-list': uris.join('\r\n') })])
}
