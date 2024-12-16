import DBMain from "../db/main";
import {StrUtil} from "../../lib/util";

export const KVDBVersionManager = {
    async _getExist(name: string) {
        const records = await DBMain.select("select * from kvdb_data where name = ? and isDeleted = 0", [name])
        for (let i = 1; i < records.length; i++) {
            await DBMain.delete("delete from kvdb_data where id = ?", [records[i].id])
        }
        return records.length > 0 ? records[0] : null
    },
    async update(name: string) {
        if (this.shouldIgnore(name)) {
            return
        }
        // console.log('update', {name})
        const exist = await this._getExist(name)
        if (exist) {
            await DBMain.update("update kvdb_data set version = -1 where id = ?", [exist.id])
        } else {
            await DBMain.insert("insert into kvdb_data (id, name, version, cloudVersion, isDeleted) values (?,?,-1,0,0)", [StrUtil.bigIntegerId(), name])
        }
    },
    async insert(name: string) {
        await this.update(name)
    },
    async remove(name: string) {
        if (this.shouldIgnore(name)) {
            return
        }
        const exist = await this._getExist(name)
        // console.log('remove', {name, exist})
        if (exist) {
            await DBMain.update("update kvdb_data set isDeleted = 1, version = -1 where id = ?", [exist.id])
        } else {
            await DBMain.insert("insert into kvdb_data (id, name, version, cloudVersion, isDeleted ) values (?, ?, -1, 0, 1)", [StrUtil.bigIntegerId(), name])
        }
    },
    shouldIgnore(name: string) {
        return [
            // 系统存储版本号的kvdb
            'SYS/syncCloudVersion',
        ].includes(name)
    },
}
