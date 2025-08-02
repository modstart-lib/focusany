type RevisionId = string;

export type Doc<T extends {} = Record<string, any>> = {
    _id: string;
    _rev?: string;
    _attachments?: any;
} & T;

export interface DocRes {
    id: string;
    ok: boolean;
    rev: RevisionId;
    _id: string;
    data?: any;
}

export interface DBError {
    status?: number | undefined;
    name?: string | undefined;
    message?: string | undefined;
    reason?: string | undefined;
    error?: string | boolean | undefined;
    id?: string | undefined;
    rev?: RevisionId | undefined;
}

export interface AllDocsOptions {
    include_docs?: boolean;
    startkey?: string;
    endkey?: string;
    keys?: string[];
}
