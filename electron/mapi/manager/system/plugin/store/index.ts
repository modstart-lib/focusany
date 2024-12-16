import {UserApi} from "../../../../user/main";
import {Files} from "../../../../file/main";
import {Manager} from "../../../manager";
import {PluginType} from "../../../../../../src/types/Manager";
import {ManagerPlugin} from "../../../plugin";
// @ts-ignore
import {mapError} from "../../../../../../src/lib/error";
import {Misc} from "../../../../misc";
import fs from "node:fs";
import {resolve} from "node:path";
import {MarkdownUtil} from "../../../../../lib/util";

export const ManagerPluginStore = {
    async install(pluginName: string, option?: {
        version?: string,
    }) {
        option = Object.assign({
            version: null,
        }, option)
        const payload = {
            plugin: pluginName,
            version: option['version'],
        }
        const existPlugin = await ManagerPlugin.get(pluginName)
        let isUpgrade = false
        if (existPlugin && existPlugin.version !== option['version']) {
            isUpgrade = true
        }
        try {
            if (isUpgrade) {
                await ManagerPlugin.uninstall(pluginName)
            }
            const infoRes = await UserApi.post('store/plugin_info_guest', payload)
            await ManagerPlugin.configCheck(infoRes.data['config'])
            // console.log('ManagerPluginStore.install', JSON.stringify({pluginName, option, data: infoRes.data}, null, 2));
            const packageRes = await UserApi.post('store/plugin_package_guest', payload)
            const packageUrl = packageRes.data['package']
            const packageMd5 = packageRes.data['packageMd5']
            // console.log('ManagerPluginStore.install', JSON.stringify({pluginName, option, packageRes}, null, 2));
            const tempFile = await Files.temp('zip')
            // console.log('ManagerPluginStore.install', JSON.stringify({pluginName, option, tempFile}, null, 2));
            // console.log('ManagerPluginStore.install.downloadStart');
            let lastPercent = 0
            await Files.download(packageUrl, tempFile, {
                isFullPath: true,
                progress(percent, total) {
                    const p = Math.floor(percent * 100 * 0.99)
                    if (lastPercent != p) {
                        lastPercent = p
                        // console.log('ManagerPluginStore.install.downloadProgress', {p, total});
                        Manager.sendBroadcast('store', 'PluginInstallProgress', {
                            pluginName: pluginName,
                            percent: p,
                        })
                    }
                },
            })
            // console.log('ManagerPluginStore.install.downloadEnd');
            // console.log('ManagerPluginStore.install.start');
            await ManagerPlugin.installFromFileOrDir(tempFile, PluginType.STORE)
            // console.log('ManagerPluginStore.install.end');
        } catch (e) {
            throw mapError(e)
        }
    },
    async publish(pluginName: string, option?: {
        version?: string,
    }) {
        option = Object.assign({
            version: null,
        }, option)
        const plugin = await Manager.getPlugin(pluginName)
        if (!plugin) {
            throw 'PluginNotExists'
        }
        if (plugin.type !== PluginType.DIR) {
            throw 'PluginNotPublishAble'
        }
        if (plugin.version !== option['version']) {
            throw 'PublishVersionNotMatch'
        }
        if (!plugin.runtime.root) {
            throw 'PluginNotPublishAble'
        }
        const root = plugin.runtime.root
        const config = await Files.read(resolve(root, 'config.json'), {
            isFullPath: true,
        })
        if (!config) {
            throw 'PluginFormatError'
        }
        let configJson = null
        try {
            configJson = JSON.parse(config)
        } catch (e) {
        }
        if (!configJson) {
            throw 'PluginFormatError'
        }
        const payload = {
            plugin: pluginName,
            version: option['version'],
            feature: null,
            content: null,
            package: null,
        }
        configJson["development"] = configJson["development"] || {}
        if (configJson["development"]["env"] === 'dev') {
            throw 'PluginEnvError'
        }
        configJson["development"]["releaseDoc"] = configJson["development"]["releaseDoc"] || 'release.md'
        const releaseDocPath = resolve(root, configJson["development"]["releaseDoc"]);
        const releaseDoc = await Files.read(releaseDocPath, {
            isFullPath: true,
        })
        if (releaseDoc) {
            const parts = releaseDoc.split('---')
            for (const part of parts) {
                let lines = part.split('\n')
                while (!payload.feature && lines.length) {
                    const line = lines.shift()
                    // ## x.x.x 功能特性
                    if (line.startsWith('##')) {
                        const parts = line.split(' ')
                        if (parts.length === 3) {
                            if (parts[1] === payload.version) {
                                payload.feature = parts[2]
                                payload.content = MarkdownUtil.toHtml(lines.join('\n').trim())
                                break
                            }
                        }
                    }
                }
                if (payload.feature) {
                    break
                }
            }
        }
        if (!payload.feature || !payload.content) {
            throw 'PluginReleaseDocNotFound'
        }
        const pluginInfo = await this._getPluginInfo(root, configJson)
        const tempFile = await Files.temp('zip')
        await Misc.zip(tempFile, plugin.runtime.root)
        if (!fs.existsSync(tempFile)) {
            throw 'PluginZipError'
        }
        const buffer = await Files.readBuffer(tempFile, {
            isFullPath: true,
        })
        payload.package = buffer.toString('base64')
        await Files.deletes(tempFile, {
            isFullPath: true,
        })
        return await UserApi.post('store/plugin_publish', {
            ...payload,
            ...pluginInfo,
        })
    },
    async publishInfo(pluginName: string, option?: {
        version?: string,
    }) {
        option = Object.assign({
            version: null,
        }, option)
        const plugin = await Manager.getPlugin(pluginName)
        if (!plugin) {
            throw 'PluginNotExists'
        }
        if (plugin.type !== PluginType.DIR) {
            throw 'PluginNotPublishAble'
        }
        if (plugin.version !== option['version']) {
            throw 'PublishVersionNotMatch'
        }
        if (!plugin.runtime.root) {
            throw 'PluginNotPublishAble'
        }
        const root = plugin.runtime.root
        const config = await Files.read(resolve(root, 'config.json'), {
            isFullPath: true,
        })
        if (!config) {
            throw 'PluginFormatError'
        }
        let configJson = null
        try {
            configJson = JSON.parse(config)
        } catch (e) {
        }
        if (!configJson) {
            throw 'PluginFormatError'
        }
        const payload = {
            plugin: pluginName,
            version: option['version'],
        }
        const pluginInfo = await this._getPluginInfo(root, configJson)
        return await UserApi.post('store/plugin_publish_info', {
            ...payload,
            ...pluginInfo,
        })
    },
    async _getPluginInfo(root: string, configJson: any) {
        const result = {
            pluginContent: null,
            pluginPreview: null,
        }
        configJson["development"] = configJson["development"] || {}
        configJson["development"]["contentDoc"] = configJson["development"]["contentDoc"] || 'content.md'
        const contentDocPath = resolve(root, configJson["development"]["contentDoc"]);
        const contentDoc = await Files.read(contentDocPath, {
            isFullPath: true,
        })
        if (contentDoc) {
            result.pluginContent = MarkdownUtil.toHtml(contentDoc)
        }
        configJson["development"]["previewDoc"] = configJson["development"]["previewDoc"] || 'preview.md'
        const previewDocPath = resolve(root, configJson["development"]["previewDoc"]);
        const previewDoc = await Files.read(previewDocPath, {
            isFullPath: true,
        })
        if (previewDoc) {
            const images = []
            previewDoc.split("\n").forEach((line: string) => {
                // https://example.com/path/to/image.png
                // ![image](https://example.com/path/to/image.png)
                const match = line.match(/!\[.*?\]\((.*?)\)/)
                if (match) {
                    images.push(match[1].trim())
                } else {
                    images.push(line.trim())
                }
            })
            result.pluginPreview = JSON.stringify(images.filter(url => !!url))
        }
        return result
    }
}

// setTimeout(() => {
//     ManagerPluginStore.publishInfo('AxxxdDddd', {
//         version: '1.2.0',
//     })
// }, 3000)
