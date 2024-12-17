export function mapError(msg: any) {
    if (typeof msg !== 'string') {
        msg = msg.toString()
    }
    const map = {
        'PublishVersionNotMatch': '插件版本不匹配',
        'PluginNotExists': '插件不存在',
        'PluginFormatError': '插件格式错误',
        'PluginAlreadyExists': '插件已存在',
        'PluginNotSupportPlatform': '插件不支持当前平台',
        'PluginVersionNotMatch': 'FocusAny版本不满足插件要求',
        'PluginReleaseDocNotFound': '插件release文档不存在',
        'PluginReleaseDocFormatError': '插件release文档格式错误',
    }
    for (let key in map) {
        if (msg.includes(key)) {
            let error = map[key]
            // regex PluginReleaseDocFormatError:-11
            const regex = new RegExp(`${key}:(-?\\d+)`)
            const match = msg.match(regex)
            if (match) {
                error += `(${match[1]})`
            }
            return error
        }
    }
    return msg
}
