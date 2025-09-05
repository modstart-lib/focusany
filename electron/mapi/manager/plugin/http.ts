import express from "express";
import Apps from "../../app";
import {Log} from "../../log/main";
import {ManagerPlugin} from "./index";
import {PluginRecord} from "../../../../src/types/Manager";
import {serveMcpRPC, serveMcpSSE} from "./httpMCP";

async function servePluginStatic(req, res) {
    const paths: string[] = req.params.path;
    if (!paths || !paths.length) {
        res.status(404).send('Plugin Static Server : Not Found');
        return;
    }
    // console.log('servePluginStatic', paths);
    const pluginName = paths.shift();
    const pluginFile = paths.join('/');
    const plugin: PluginRecord = await ManagerPlugin.get(pluginName)
    if (!plugin) {
        res.status(404).send('Plugin Static Server : Not Found');
        return;
    }
    if (!plugin.setting?.httpEntry) {
        res.status(404).send('Plugin Static Server : Plugin HTTP Entry Not Enabled');
        return;
    }
    express.static(plugin.runtime.root)(Object.assign(req, {url: `/${pluginFile}`}), res, (err) => {
        if (err) {
            res.status(500).send('Plugin Static Server : ' + err.message);
        } else {
            res.status(404).send('Plugin Static Server : Not Found');
        }
    });
}

export const PluginHttp = {
    app: null,
    port: 61000,
    ip: '127.0.0.1',
    async init() {
        PluginHttp.app = express();
        PluginHttp.app.use(express.json());
        PluginHttp.app.all('/plugin/*path', servePluginStatic);
        PluginHttp.app.post('/mcp', serveMcpRPC);
        PluginHttp.app.get('/mcp', serveMcpSSE);
        PluginHttp.port = await Apps.availablePort(PluginHttp.port);
        return new Promise((resolve, reject) => {
            PluginHttp.app.listen(PluginHttp.port, PluginHttp.ip, () => {
                Log.info('PluginHttp.Listen', {port: PluginHttp.port});
            });
        });
    },
    async getMcpServer() {
        if (!PluginHttp.app) {
            await PluginHttp.init();
        }
        return `http://${PluginHttp.ip}:${PluginHttp.port}/mcp`;
    },
    async url(pluginName: string, filePath: string): Promise<string> {
        if (!PluginHttp.app) {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(PluginHttp.url(pluginName, filePath));
                }, 100)
            });
        }
        if (!pluginName || !filePath) {
            throw new Error('Plugin name and file path are required');
        }
        return `http://${PluginHttp.ip}:${PluginHttp.port}/plugin/${pluginName}/${filePath}`;
    }
}
