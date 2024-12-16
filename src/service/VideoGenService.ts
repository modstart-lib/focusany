import {TimeUtil} from "../lib/util";
import {useTaskStore} from "../store/modules/task";

const taskStore = useTaskStore()

export type VideoGenRecord = {
    id?: number;

    serverName: string;
    serverTitle: string;
    serverVersion: string;

    videoTemplateId: number;
    videoTemplateName: string;
    soundType: string;
    soundTtsId: number;
    soundTtsText: string;
    soundCloneId: number;
    soundCloneText: string;

    param?: any;

    status?: 'queue' | 'running' | 'success' | 'fail';
    statusMsg?: string;
    jobId?: string;
    jobResult?: any;
    startTime?: number,
    endTime?: number | undefined,
    resultMp4?: string;

    runtime?: VideoGenRuntime,
}

export type VideoGenRuntime = {}

export const VideoGenService = {
    tableName() {
        return 'data_video_gen'
    },
    async resultMp4Path(record: VideoGenRecord) {
        return await window.$mapi.file.fullPath(`videoGen/${record.id}.mp4`)
    },
    decodeRecord(record: VideoGenRecord): VideoGenRecord | null {
        if (!record) {
            return null
        }
        return {
            ...record,
            param: JSON.parse(record.param ? record.param : '{}'),
            jobResult: JSON.parse(record.jobResult ? record.jobResult : '{}')
        } as VideoGenRecord
    },
    encodeRecord(record: VideoGenRecord): VideoGenRecord {
        if ('param' in record) {
            record.param = JSON.stringify(record.param || {})
        }
        if ('jobResult' in record) {
            record.jobResult = JSON.stringify(record.jobResult || {})
        }
        return record
    },
    async get(id: number): Promise<VideoGenRecord | null> {
        const record: any = await window.$mapi.db.first(`SELECT *
                                                         FROM ${this.tableName()}
                                                         WHERE id = ?`, [id])
        return this.decodeRecord(record)
    },
    async list(): Promise<VideoGenRecord[]> {
        const records: VideoGenRecord[] = await window.$mapi.db.select(`SELECT *
                                                                        FROM ${this.tableName()}
                                                                        ORDER BY id DESC`)
        return records.map(this.decodeRecord) as VideoGenRecord[]
    },
    async restoreForTask() {
        const records: VideoGenRecord[] = await window.$mapi.db.select(`SELECT *
                                                                        FROM ${this.tableName()}
                                                                        WHERE status = 'running'
                                                                           OR status = 'queue'
                                                                        ORDER BY id DESC`)
        // console.log('VideoGenService.restoreForTask', records.length)
        for (let record of records) {
            let status = record.status === 'running' ? 'querying' : 'queue'
            await taskStore.dispatch('VideoGen', record.id as any, {}, {
                status: status,
                runStart: record.startTime,
            })
        }
    },
    async submit(record: VideoGenRecord) {
        record.status = 'queue'
        record.startTime = TimeUtil.timestampMS()
        const fields = [
            'serverName', 'serverTitle', 'serverVersion',
            'videoTemplateId', 'videoTemplateName',
            'soundType', 'soundTtsId', 'soundTtsText', 'soundCloneId', 'soundCloneText',
            'param',
            'status', 'statusMsg', 'startTime', 'endTime',
        ]
        record = this.encodeRecord(record)
        const values = fields.map(f => record[f])
        const valuesPlaceholder = fields.map(f => '?')
        const id = await window.$mapi.db.insert(`INSERT INTO ${this.tableName()} (${fields.join(',')})
                                                 VALUES (${valuesPlaceholder.join(',')})`, values)
        await taskStore.dispatch('VideoGen', id)
    },
    async update(id: number, record: Partial<VideoGenRecord>) {
        record = this.encodeRecord(record as VideoGenRecord)
        const fields = Object.keys(record)
        const values = fields.map(f => record[f])
        const set = fields.map(f => `${f} = ?`).join(',')
        return await window.$mapi.db.execute(`UPDATE ${this.tableName()}
                                              SET ${set}
                                              WHERE id = ?`, [...values, id])
    },
    async saveResultMp4(record: VideoGenRecord, resultMp4: string) {
        const resultMp4Abs = window.$mapi.file.absolutePath(resultMp4)
        const resultMp4New = await VideoGenService.resultMp4Path(record)
        const resultMp4NewAbs = window.$mapi.file.absolutePath(resultMp4New)
        // console.log('CloneService.saveResultWav', {resultMp4, resultMp4Abs, resultMp4New, resultMp4NewAbs})
        await window.$mapi.file.rename(resultMp4Abs, resultMp4NewAbs, {
            overwrite: true
        })
        return resultMp4New
    },
    async delete(record: VideoGenRecord) {
        if (record.resultMp4) {
            const resultMp4Abs = window.$mapi.file.absolutePath(record.resultMp4)
            await window.$mapi.file.deletes(resultMp4Abs)
        }
        await window.$mapi.db.delete(`DELETE
                                      FROM ${this.tableName()}
                                      WHERE id = ?`, [record.id])
    }
}
