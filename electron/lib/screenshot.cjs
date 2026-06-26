/**
 * 截图工具函数（CommonJS 版本，供主进程 require 使用）
 *
 * 统一提供 flattenToWhite / flattenNativeImage，确保所有截图背景为白色。
 */

const { PNG } = require('pngjs')

/**
 * 将 PNG buffer 中的透明像素合成到白色背景上，返回不含透明通道的 PNG buffer。
 */
function flattenToWhite(buf) {
    try {
        const png = PNG.sync.read(buf)
        const { data, width, height } = png
        let hasAlpha = false
        for (let i = 3; i < data.length; i += 4) { if (data[i] < 255) { hasAlpha = true; break } }
        if (!hasAlpha) return Buffer.from(buf)

        const out = new PNG({ width, height })
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
            if (a === 255) { out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = 255 }
            else {
                const blend = (c) => Math.round((c * a + 255 * (255 - a)) / 255)
                out.data[i] = blend(r); out.data[i + 1] = blend(g); out.data[i + 2] = blend(b); out.data[i + 3] = 255
            }
        }
        return Buffer.from(PNG.sync.write(out))
    } catch { return Buffer.from(buf) }
}

/**
 * 将 NativeImage 截图中透明像素合成到白色背景，返回 base64 编码的 PNG 字符串。
 */
function flattenNativeImage(image) {
    return flattenToWhite(Buffer.from(image.toPNG())).toString('base64')
}

module.exports = { flattenToWhite, flattenNativeImage }
