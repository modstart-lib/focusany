import {VideoGenRecord} from "./VideoGenService";

export type VideoTemplateRecord = {
    id?: number;
    name: string;
    video: string;
}

export const VideoTemplateService = {
    tableName() {
        return 'data_video_template'
    },
    decodeRecord(record: VideoTemplateRecord): VideoTemplateRecord | null {
        if (!record) {
            return null
        }
        return {
            ...record,
        } as VideoTemplateRecord
    },
    encodeRecord(record: VideoTemplateRecord): VideoTemplateRecord {
        return record
    },
    async get(id: number): Promise<VideoTemplateRecord | null> {
        const record: any = await window.$mapi.db.first(`SELECT *
                                                         FROM ${this.tableName()}
                                                         WHERE id = ?`, [id])
        return this.decodeRecord(record)
    },
    async getByName(name: string): Promise<VideoTemplateRecord | null> {
        const record: any = await window.$mapi.db.first(`SELECT *
                                                         FROM ${this.tableName()}
                                                         WHERE name = ?`, [name])
        return this.decodeRecord(record)
    },
    async list(): Promise<VideoTemplateRecord[]> {
        const records: VideoTemplateRecord[] = await window.$mapi.db.select(`SELECT *
                                                                             FROM ${this.tableName()}
                                                                             ORDER BY id DESC`)
        return records.map(this.decodeRecord) as VideoTemplateRecord[]
    },
    async insert(record: VideoTemplateRecord) {
        return await window.$mapi.db.insert(`INSERT INTO ${this.tableName()} (name, video)
                                             VALUES (?, ?)`, [record.name, record.video])
    },
    async delete(record: VideoTemplateRecord) {
        if (record.video) {
            await window.$mapi.file.deletes(record.video, {
                isFullPath: true
            })
        }
        await window.$mapi.db.delete(`DELETE
                                      FROM ${this.tableName()}
                                      WHERE id = ?`, [record.id])
    },
    async update(record: VideoTemplateRecord) {
        await window.$mapi.db.update(`UPDATE ${this.tableName()}
                                      SET name  = ?,
                                          video = ?
                                      WHERE id = ?`, [record.name, record.video, record.id])
    }
}
