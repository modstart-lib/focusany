import {Files} from "../../../../../file/main";
import fs from "node:fs";
import {IconvUtil} from "../../../../../../lib/util";

const langDirMap = {
    'en-US': ['en.lproj'],
    'zh-CN': ['zh-Hans.lproj', 'zh_CN.lproj'],
}

export const getAppTitle = async (locale: string, pathname: string, name: string) => {
    if (!(locale in langDirMap)) {
        return name
    }
    const langDirs = langDirMap[locale]
    // console.log('langDirs', langDirs)
    for (const langDir of langDirs) {
        const infoPlistPath = pathname + '/Contents/Resources/' + langDir + '/InfoPlist.strings'
        // console.log('infoPlistPath', infoPlistPath)
        if (!await Files.exists(infoPlistPath, {isFullPath: true})) {
            continue
        }
        const buffer = await Files.readBuffer(infoPlistPath, {
            isFullPath: true,
        })
        const content = IconvUtil.bufferToUtf8(buffer) as string
        // console.log('content', infoPlistPath, content.toString('utf8'))
        // CFBundleName = "网易邮箱大师";
        if (content) {
            // console.log('content', JSON.stringify(content))
            // CFBundleDisplayName = "网易邮箱大师";
            const reg = new RegExp('"?CFBundleDisplayName"?.*?=.*?"(.*)".*?;')
            const match = content.match(reg)
            if (match) {
                // console.log('content.result', match[1])
                return match[1]
            }
        }
    }
    // console.log('===============')
    // console.log('getAppTitle', locale, pathname, name)
    return name
}
