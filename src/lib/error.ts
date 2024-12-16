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
    }
    for (let key in map) {
        if (msg.includes(key)) {
            return map[key]
        }
    }
    return msg
}
