import express from "express";
import Apps from "../../app";
import {Log} from "../../log/main";
import {ManagerPlugin} from "./index";
import {PluginRecord} from "../../../../src/types/Manager";

export const PluginHttp = {
    app: null,
    port: 61000,
    ip: '127.0.0.1',
    async init() {
        PluginHttp.app = express();
        PluginHttp.app.use(async (req, res, next) => {
            if (!req.path) {
                res.status(404).send('Not Found');
                return;
            }
            const pcs = req.path.replace(/^\/+/, '').split('/');
            if (pcs.length < 2) {
                res.status(404).send('Not Found');
                return;
            }
            const group = pcs[0];
            if ('plugin' === group) {
                const pluginName = pcs[1];
                const pluginFile = pcs.slice(2).join('/');
                const plugin: PluginRecord = await ManagerPlugin.get(pluginName)
                if (!plugin) {
                    res.status(404).send('Plugin Not Found');
                    return;
                }
                if (!plugin.setting?.httpEntry) {
                    res.status(404).send('Plugin HTTP Entry Not Enabled');
                    return;
                }
                express.static(plugin.runtime.root)(Object.assign(req, {url: `/${pluginFile}`}), res, next);
            } else {
                next();
            }
        });
        PluginHttp.port = await Apps.availablePort(PluginHttp.port);
        return new Promise((resolve, reject) => {
            PluginHttp.app.listen(PluginHttp.port, PluginHttp.ip, () => {
                Log.info('PluginHttp.Listen', {port: PluginHttp.port});
            });
        });
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
