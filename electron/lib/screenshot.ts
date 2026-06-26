import { PNG } from 'pngjs'

/** 将 PNG buffer 中透明像素合成到白色背景，返回不含透明通道的 PNG buffer */
export function flattenToWhite(buf: Buffer): Buffer {
    try {
        const png = PNG.sync.read(buf as any)
        const { data, width, height } = png
        let hasAlpha = false
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) {
                hasAlpha = true
                break
            }
        }
        if (!hasAlpha) return Buffer.from(buf)
        const out = new PNG({ width, height })
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i],
                g = data[i + 1],
                b = data[i + 2],
                a = data[i + 3]
            if (a === 255) {
                out.data[i] = r
                out.data[i + 1] = g
                out.data[i + 2] = b
                out.data[i + 3] = 255
            } else {
                const blend = (c: number) => Math.round((c * a + 255 * (255 - a)) / 255)
                out.data[i] = blend(r)
                out.data[i + 1] = blend(g)
                out.data[i + 2] = blend(b)
                out.data[i + 3] = 255
            }
        }
        return Buffer.from(PNG.sync.write(out))
    } catch {
        return Buffer.from(buf)
    }
}
