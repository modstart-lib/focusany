import {TimeUtil} from "../lib/util";
import {useTaskStore} from "../store/modules/task";

const taskStore = useTaskStore()

export type SoundTtsRecord = {
    id?: number;

    serverName: string;
    serverTitle: string;
    serverVersion: string;
    text: string;
    param: any;

    status?: 'queue' | 'running' | 'success' | 'fail';
    statusMsg?: string;
    jobId?: string;
    jobResult?: any;
    startTime?: number,
    endTime?: number | undefined,
    resultWav?: string;

    runtime?: SoundTtsRuntime,
}

export type SoundTtsRuntime = {}

export const SoundTtsService = {
    tableName() {
        return 'data_sound_tts'
    },
    async resultWavPath(record: SoundTtsRecord) {
        return await window.$mapi.file.fullPath(`soundTts/${record.id}.wav`)
    },
    decodeRecord(record: SoundTtsRecord): SoundTtsRecord | null {
        if (!record) {
            return null
        }
        return {
            ...record,
            param: JSON.parse(record.param ? record.param : '{}'),
            jobResult: JSON.parse(record.jobResult ? record.jobResult : '{}')
        } as SoundTtsRecord
    },
    encodeRecord(record: SoundTtsRecord): SoundTtsRecord {
        if ('param' in record) {
            record.param = JSON.stringify(record.param || {})
        }
        if ('jobResult' in record) {
            record.jobResult = JSON.stringify(record.jobResult || {})
        }
        return record
    },
    async get(id: number): Promise<SoundTtsRecord | null> {
        const record: any = await window.$mapi.db.first(`SELECT *
                                                         FROM ${this.tableName()}
                                                         WHERE id = ?`, [id])
        return this.decodeRecord(record)
    },
    async list(): Promise<SoundTtsRecord[]> {
        const records: SoundTtsRecord[] = await window.$mapi.db.select(`SELECT *
                                                                        FROM ${this.tableName()}
                                                                        ORDER BY id DESC`)
        return records.map(this.decodeRecord) as SoundTtsRecord[]
    },
    async restoreForTask() {
        const records: SoundTtsRecord[] = await window.$mapi.db.select(`SELECT *
                                                                        FROM ${this.tableName()}
                                                                        WHERE status = 'running'
                                                                           OR status = 'queue'
                                                                        ORDER BY id DESC`)
        // console.log('SoundTtsService.restoreForTask', records.length)
        for (let record of records) {
            let status = record.status === 'running' ? 'querying' : 'queue'
            await taskStore.dispatch('SoundTts', record.id as any, {}, {
                status: status,
                runStart: record.startTime,
            })
        }
    },
    async submit(record: SoundTtsRecord) {
        record.status = 'queue'
        record.startTime = TimeUtil.timestampMS()
        const fields = [
            'serverName', 'serverTitle', 'serverVersion',
            'text', 'param',
            'status', 'statusMsg', 'startTime', 'endTime',
        ]
        record = this.encodeRecord(record)
        const values = fields.map(f => record[f])
        const valuesPlaceholder = fields.map(f => '?')
        const id = await window.$mapi.db.insert(`INSERT INTO ${this.tableName()} (${fields.join(',')})
                                                 VALUES (${valuesPlaceholder.join(',')})`, values)
        await taskStore.dispatch('SoundTts', id)
    },
    async update(id: number, record: Partial<SoundTtsRecord>) {
        record = this.encodeRecord(record as SoundTtsRecord)
        const fields = Object.keys(record)
        const values = fields.map(f => record[f])
        const set = fields.map(f => `${f} = ?`).join(',')
        return await window.$mapi.db.update(`UPDATE ${this.tableName()}
                                             SET ${set}
                                             WHERE id = ?`, [...values, id])
    },
    async saveResultWav(record: SoundTtsRecord, resultWav: string) {
        const resultWavAbs = window.$mapi.file.absolutePath(resultWav)
        const resultWavNew = await SoundTtsService.resultWavPath(record)
        const resultWavNewAbs = window.$mapi.file.absolutePath(resultWavNew)
        // console.log('TtsService.saveResultWav', {resultWav, resultWavAbs, resultWavNew, resultWavNewAbs})
        await window.$mapi.file.rename(resultWavAbs, resultWavNewAbs, {
            overwrite: true
        })
        return resultWavNew
    },
    async delete(record: SoundTtsRecord) {
        if (record.resultWav) {
            const resultWavAbs = window.$mapi.file.absolutePath(record.resultWav)
            await window.$mapi.file.deletes(resultWavAbs)
        }
        await window.$mapi.db.delete(`DELETE
                                      FROM ${this.tableName()}
                                      WHERE id = ?`, [record.id])
    }
}
