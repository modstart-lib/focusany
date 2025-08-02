import {TimeUtil} from "../lib/util";
import {useTaskStore} from "../store/modules/task";

const taskStore = useTaskStore();

export type SoundCloneRecord = {
    id?: number;

    serverName: string;
    serverTitle: string;
    serverVersion: string;
    promptName: string;
    promptWav: string;
    promptText: string;
    text: string;
    speed: number;
    seed: number;
    param?: any;

    status?: "queue" | "running" | "success" | "fail";
    statusMsg?: string;
    jobId?: string;
    jobResult?: any;
    startTime?: number;
    endTime?: number | undefined;
    resultWav?: string;

    runtime?: SoundCloneRuntime;
};

export type SoundCloneRuntime = {};

export const SoundCloneService = {
    tableName() {
        return "data_sound_clone";
    },
    async resultWavPath(record: SoundCloneRecord) {
        return await window.$mapi.file.fullPath(`soundClone/${record.id}.wav`);
    },
    decodeRecord(record: SoundCloneRecord): SoundCloneRecord | null {
        if (!record) {
            return null;
        }
        return {
            ...record,
            param: JSON.parse(record.param ? record.param : "{}"),
            jobResult: JSON.parse(record.jobResult ? record.jobResult : "{}"),
        } as SoundCloneRecord;
    },
    encodeRecord(record: SoundCloneRecord): SoundCloneRecord {
        if ("param" in record) {
            record.param = JSON.stringify(record.param || {});
        }
        if ("jobResult" in record) {
            record.jobResult = JSON.stringify(record.jobResult || {});
        }
        return record;
    },
    async get(id: number): Promise<SoundCloneRecord | null> {
        const record: any = await window.$mapi.db.first(
            `SELECT *
                                                         FROM ${this.tableName()}
                                                         WHERE id = ?`,
            [id]
        );
        return this.decodeRecord(record);
    },
    async list(): Promise<SoundCloneRecord[]> {
        const records: SoundCloneRecord[] = await window.$mapi.db.select(`SELECT *
                                                                          FROM ${this.tableName()}
                                                                          ORDER BY id DESC`);
        return records.map(this.decodeRecord) as SoundCloneRecord[];
    },
    async restoreForTask() {
        const records: SoundCloneRecord[] = await window.$mapi.db.select(`SELECT *
                                                                          FROM ${this.tableName()}
                                                                          WHERE status = 'running'
                                                                             OR status = 'queue'
                                                                          ORDER BY id DESC`);
        // console.log('SoundCloneService.restoreForTask', records.length)
        for (let record of records) {
            let status = record.status === "running" ? "querying" : "queue";
            await taskStore.dispatch(
                "SoundClone",
                record.id as any,
                {},
                {
                    status: status,
                    runStart: record.startTime,
                }
            );
        }
    },
    async submit(record: SoundCloneRecord) {
        record.status = "queue";
        record.startTime = TimeUtil.timestampMS();
        const fields = [
            "serverName",
            "serverTitle",
            "serverVersion",
            "promptName",
            "promptWav",
            "promptText",
            "text",
            "speed",
            "seed",
            "param",
            "status",
            "statusMsg",
            "startTime",
            "endTime",
        ];
        record = this.encodeRecord(record);
        const values = fields.map(f => record[f]);
        const valuesPlaceholder = fields.map(f => "?");
        const id = await window.$mapi.db.insert(
            `INSERT INTO ${this.tableName()} (${fields.join(",")})
                                                 VALUES (${valuesPlaceholder.join(",")})`,
            values
        );
        await taskStore.dispatch("SoundClone", id);
    },
    async update(id: number, record: Partial<SoundCloneRecord>) {
        record = this.encodeRecord(record as SoundCloneRecord);
        const fields = Object.keys(record);
        const values = fields.map(f => record[f]);
        const set = fields.map(f => `${f} = ?`).join(",");
        return await window.$mapi.db.execute(
            `UPDATE ${this.tableName()}
                                              SET ${set}
                                              WHERE id = ?`,
            [...values, id]
        );
    },
    async saveResultWav(record: SoundCloneRecord, resultWav: string) {
        const resultWavAbs = window.$mapi.file.absolutePath(resultWav);
        const resultWavNew = await SoundCloneService.resultWavPath(record);
        const resultWavNewAbs = window.$mapi.file.absolutePath(resultWavNew);
        // console.log('CloneService.saveResultWav', {resultWav, resultWavAbs, resultWavNew, resultWavNewAbs})
        await window.$mapi.file.rename(resultWavAbs, resultWavNewAbs, {
            overwrite: true,
        });
        return resultWavNew;
    },
    async delete(record: SoundCloneRecord) {
        if (record.resultWav) {
            const resultWavAbs = window.$mapi.file.absolutePath(record.resultWav);
            await window.$mapi.file.deletes(resultWavAbs);
        }
        await window.$mapi.db.delete(
            `DELETE
                                      FROM ${this.tableName()}
                                      WHERE id = ?`,
            [record.id]
        );
    },
};
