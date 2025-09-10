import {ManagerPlugin} from './index';
import {Log} from "../../log/main";
import {MCPToolsRecord} from "../../../../src/types/Manager";
import {ManagerBackend} from "../backend";
import {PluginLog} from "./log";

const clients = new Map<any, any>();

export async function serveMcpSSE(req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`event: ready\n`);
    res.write(`data: {}\n\n`);
    clients.set(res, true);
    Log.info('MCPServer.SSE.Connected', {total: clients.size});
    req.on("close", () => {
        clients.delete(res);
        Log.info('MCPServer.SSE.Disconnected', {total: clients.size});
    });
}

export async function serveMcpRPC(req, res) {
    const body = req.body;
    if (!body || typeof body !== 'object') {
        res.json({jsonrpc: '2.0', id: null, error: {code: -32700, message: 'Parse Error'}})
        Log.error('MCPServer', {error: 'Invalid JSON'});
        return;
    }
    // check jsonrpc 2.0
    if (body.jsonrpc !== '2.0') {
        res.json({
            jsonrpc: '2.0',
            id: body.id || null,
            error: {code: -32600, message: 'Invalid Request, only JSON-RPC 2.0 supported'}
        });
        Log.error('MCPServer', {error: 'Invalid JSON-RPC version', body});
        return;
    }
    const method = body.method;
    if (!method || typeof method !== 'string') {
        res.json({
            jsonrpc: '2.0',
            id: body.id || null,
            error: {code: -32600, message: 'Invalid Request, method required'}
        });
        Log.error('MCPServer', {error: 'Method not specified', body});
        return;
    }
    const id = body.id;
    if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
        if (![
            'initialize',
            'notifications/initialized',
            'notifications/cancelled',
        ].includes(method)) {
            res.json({jsonrpc: '2.0', id: null, error: {code: -32600, message: 'Invalid Request, id required'}});
            Log.error('MCPServer', {error: 'ID not specified', body});
            return;
        }
    }
    if (!PluginHttpMCP[method]) {
        res.json({jsonrpc: '2.0', id, error: {code: -32601, message: 'Method not found'}});
        Log.error('MCPServer', {error: 'Method not found', method, body});
        return;
    }
    const params = body.params || {};
    try {
        const result = await PluginHttpMCP[method](params);
        const json = {jsonrpc: '2.0', id, result}
        Log.info('MCPServer.call', {method, params, json});
        res.json(json);
    } catch (e) {
        Log.error('MCPServer.call', {
            method,
            params,
            error: e + '',
        });
        res.json({jsonrpc: '2.0', id, error: {code: -32000, message: e + ''}});
    }
}

export const PluginHttpMCP = {
    'initialize': async (params: Record<string, any>) => {
        return {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {
                    listChanged: false
                }
            },
            serverInfo: {
                name: 'FocusAny MCP Server',
                version: '1.0.0'
            }
        };
    },
    'notifications/initialized': async (params: Record<string, any>) => {
        return {};
    },
    'notifications/cancelled': async (params: Record<string, any>) => {
        return {};
    },
    'tools/list': async (params: Record<string, any>) => {
        const tools: MCPToolsRecord[] = [];
        const plugins = await ManagerPlugin.list();
        for (const plugin of plugins) {
            if (plugin.mcp) {
                if (plugin.mcp.tools && Array.isArray(plugin.mcp.tools)) {
                    for (const tool of plugin.mcp.tools) {
                        tools.push({
                            ...tool,
                            name: `${plugin.name}-${tool.name}`,
                        });
                    }
                }
            }
        }
        return {
            tools,
        };
    },
    'tools/call': async (params: Record<string, any>) => {
        const {name, arguments: args} = params;
        const pcs = name.split('-');
        if (pcs.length < 2) {
            throw new Error('Invalid tool name');
        }
        const pluginName = pcs.shift()!;
        const toolName = pcs.join('-');
        const plugin = await ManagerPlugin.get(pluginName);
        if (!plugin) {
            throw new Error('Plugin not found');
        }
        const result: any = await ManagerBackend.run(plugin, 'mcpTool', toolName, args || {}, {rejectIfError: true});
        if (!result) {
            PluginLog.error(plugin.name, `MCP.Tool.NoResult`, {
                toolName,
                args,
            }, true);
            throw new Error('No result from tool');
        }
        if (result.content && Array.isArray(result.content)) {
            result.content = result.content.map(item => {
                if (item.type === 'image') {
                    // remove prefix data:image/png;base64,iVBORw
                    if (item.data && item.data.startsWith('data:image')) {
                        const idx = item.data.indexOf('base64,');
                        if (idx > 0) {
                            item.data = item.data.substring(idx + 7);
                        }
                    }
                }
                return item;
            })
        }
        return result;
    }
}

setTimeout(async () => {
    // PluginHttpMCP['tools/call']({
    //     name: 'BasicExample.basic-example-weather',
    //     arguments: {city: 'Beijing'},
    // })
    // const result = await PluginHttpMCP['tools/call']({
    //     name: 'FabricEditor.fileToPng',
    //     arguments: {path: '/Users/mz/Downloads/NewFile.FabricEditor.fad'},
    // })
    // Log.info('MCPServer.Test', {result});
}, 5000);
