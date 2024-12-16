import ServerApi from './api'
import {ipcMain} from "electron";
import {Log} from "../log/main";

const serverModule = {}

const init = () => {

}

const getModule = async (serverInfo: ServerInfo) => {
    // console.log('getModule', serverInfo)
    if (!serverModule[serverInfo.localPath]) {
        try {
            const serverPath = `${serverInfo.localPath}/server.js`
            const module = await import(`file://${serverPath}`)
            // console.log('module', module)
            await module.default.init(ServerApi)
            serverModule[serverInfo.localPath] = module.default
        } catch (e) {
            Log.error('mapi.server.getModule.error', e)
            throw new Error(e)
        }
    }
    return serverModule[serverInfo.localPath]
}

ipcMain.handle('server:start', async (event, serverInfo: ServerInfo) => {
    const module = await getModule(serverInfo)
    try {
        return await module.start(serverInfo)
    } catch (e) {
        Log.error('mapi.server.start.error', e)
        throw new Error(e)
    }
})

ipcMain.handle('server:ping', async (event, serverInfo: ServerInfo) => {
    const module = await getModule(serverInfo)
    try {
        return await module.ping()
    } catch (e) {
        Log.error('mapi.server.ping.error', e)
        throw new Error(e)
    }
})

ipcMain.handle('server:stop', async (event, serverInfo: ServerInfo) => {
    const module = await getModule(serverInfo)
    try {
        return await module.stop(serverInfo)
    } catch (e) {
        Log.error('mapi.server.stop.error', e)
        throw new Error(e)
    }
})

ipcMain.handle('server:config', async (event, serverInfo: ServerInfo) => {
    const module = await getModule(serverInfo)
    try {
        return await module.config()
    } catch (e) {
        Log.error('mapi.server.config.error', e)
        throw new Error(e)
    }
})

ipcMain.handle('server:callFunction', async (event, serverInfo: ServerInfo, method: string, data: any) => {
    // console.log('getModule.before', serverInfo, method)
    const module = await getModule(serverInfo)
    // console.log('getModule.end', serverInfo, method, module)
    const func = module[method]
    if (!func) {
        throw new Error(`MethodNotFound : ${method}`)
    }
    try {
        return await func.bind(module)(serverInfo, data)
    } catch (e) {
        Log.error('mapi.server.callFunction.error', e)
        throw new Error(e)
    }
})

export default {
    init
}
