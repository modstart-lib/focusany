import {Files} from "../../file/main";
import {Log} from "../../log/main";

export const ManagerFileCacheUtil = {
    async get(name: string, defaultValue: any = null) {
        const content = await Files.read(`cache/${name}.json`, {isDataPath: true});
        if (content) {
            let json = null;
            try {
                json = JSON.parse(content);
            } catch (e) {
                Log.error("Plugin.App.Error", e);
            }
            if (!json || !("expire" in json) || !("value" in json)) {
                await Files.deletes(`cache/${name}.json`, {isDataPath: true});
                return defaultValue;
            }
            if (json.expire > 0 && json.expire < Date.now()) {
                await Files.deletes(`cache/${name}.json`, {isDataPath: true});
                return defaultValue;
            }
            return json.value;
        }
        return defaultValue;
    },
    async getIgnoreExpire(
        name: string,
        defaultValue: any = null
    ): Promise<{
        isCache: boolean;
        value: any;
        expire: number;
    }> {
        const content = await Files.read(`cache/${name}.json`, {isDataPath: true});
        if (content) {
            let json = null;
            try {
                json = JSON.parse(content);
            } catch (e) {
                Log.error("Plugin.App.Error", e);
            }
            if (!json || !("value" in json)) {
                await Files.deletes(`cache/${name}.json`, {isDataPath: true});
                return {
                    isCache: false,
                    value: defaultValue,
                    expire: 0,
                };
            }
            return {
                isCache: true,
                value: json.value,
                expire: json.expire,
            };
        }
        return {
            isCache: false,
            value: defaultValue,
            expire: 0,
        };
    },
    async set(name: string, value: any, expire: number = 0) {
        const json = {
            expire: expire > 0 ? Date.now() + expire : 0,
            value: value,
        };
        await Files.write(`cache/${name}.json`, JSON.stringify(json), {isDataPath: true});
    },
    async forget(name: string) {
        await Files.deletes(`cache/${name}.json`, {isDataPath: true});
    },
};
