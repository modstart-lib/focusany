import { ipcRenderer } from 'electron'

const list = async () => ipcRenderer.invoke('workflow:list')
const get = async (id: string) => ipcRenderer.invoke('workflow:get', id)
const insert = async (payload: any) => ipcRenderer.invoke('workflow:insert', payload)
const update = async (payload: any) => ipcRenderer.invoke('workflow:update', payload)
const remove = async (id: string) => ipcRenderer.invoke('workflow:delete', id)
const run = async (id: string, option?: any) => ipcRenderer.invoke('workflow:run', id, option)
const emit = async (eventName: string) => ipcRenderer.invoke('workflow:emit', eventName)
const listLog = async () => ipcRenderer.invoke('workflow:listLog')
const listModels = async () => ipcRenderer.invoke('workflow:listModels')

export default { list, get, insert, update, delete: remove, run, emit, listLog, listModels }
