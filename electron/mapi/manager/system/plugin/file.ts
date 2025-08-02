import {
    ActionMatch,
    ActionMatchTypeEnum,
    ActionRecord,
    ActionTypeEnum,
    FilePluginRecord,
    PluginRecord,
} from "../../../../../src/types/Manager";
import {MemoryCacheUtil, ShellUtil} from "../../../../lib/util";
import {SystemIcons} from "../asset/icon";
import {KVDBMain} from "../../../kvdb/main";
import {CommonConfig} from "../../../../config/common";

export const FilePlugin: PluginRecord = {
    name: "file",
    title: "文件启动",
    version: "1.0.0",
    logo: SystemIcons.folder,
    description: "提供文件一键启动功能",
    main: null,
    preload: null,
    actions: [],
};

const listActions = async () => {
    return await MemoryCacheUtil.remember("FileActions", async () => {
        const actions: ActionRecord[] = [];
        const records = await ManagerSystemPluginFile.list();
        records.forEach((record, recordIndex) => {
            actions.push({
                fullName: `${FilePlugin.name}/${record.title}`,
                pluginName: FilePlugin.name,
                name: record.title,
                title: record.title,
                icon: record.icon,
                type: ActionTypeEnum.COMMAND,
                matches: [
                    {
                        type: ActionMatchTypeEnum.TEXT,
                        text: record.title,
                    } as ActionMatch,
                ],
                data: {
                    command: "open " + ShellUtil.quotaPath(record.path),
                },
            });
        });
        return actions;
    });
};

export const getFilePlugin = async () => {
    FilePlugin.actions = await listActions();
    return FilePlugin;
};

export const ManagerSystemPluginFile = {
    async list(): Promise<FilePluginRecord[]> {
        return MemoryCacheUtil.remember("Files", async () => {
            const res = await KVDBMain.getData(CommonConfig.dbSystem, CommonConfig.dbFileId);
            if (res) {
                return res["records"] || [];
            }
            return [];
        });
    },
    async update(records: FilePluginRecord[]) {
        await KVDBMain.putForce(CommonConfig.dbSystem, {
            _id: CommonConfig.dbFileId,
            records: records,
        });
        MemoryCacheUtil.forget("Files");
        MemoryCacheUtil.forget("FileActions");
    },
};
