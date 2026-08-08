import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type ClientConfig = {
    dataPath: string
}

const focusanyRoot = () => path.join(os.homedir(), '.focusany')

const defaultClientConfig = (): ClientConfig => ({
    dataPath: path.join(focusanyRoot(), 'data'),
})

const expandHome = (value: string): string => {
    if (value === '~') {
        return os.homedir()
    }
    if (value.startsWith(`~${path.sep}`) || value.startsWith('~/')) {
        return path.join(os.homedir(), value.slice(2))
    }
    return value
}

const writeClientConfig = (filePath: string, config: ClientConfig) => {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
}

export const getClientConfigPath = () => path.join(focusanyRoot(), 'client.json')

export const loadClientConfig = (): ClientConfig => {
    // FOCUSANY_DATA_ROOT 环境变量优先级最高（由安装版 Info.plist 的 LSEnvironment 注入，
    // 用于把正式使用数据隔离到独立目录，避免被开发测试的种子数据破坏）
    const envDataRoot = process.env.FOCUSANY_DATA_ROOT
    if (envDataRoot && envDataRoot.trim()) {
        return {
            dataPath: path.resolve(expandHome(envDataRoot)),
        }
    }
    const filePath = getClientConfigPath()
    const defaultConfig = defaultClientConfig()
    if (!fs.existsSync(filePath)) {
        writeClientConfig(filePath, defaultConfig)
        return defaultConfig
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    const config = JSON.parse(data) as Partial<ClientConfig>
    const dataPath =
        typeof config.dataPath === 'string' && config.dataPath.trim() ? config.dataPath : defaultConfig.dataPath
    return {
        dataPath: path.resolve(expandHome(dataPath)),
    }
}
