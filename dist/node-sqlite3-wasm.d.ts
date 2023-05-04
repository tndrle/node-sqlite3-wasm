// Type definitions for node-sqlite3-wasm
// Project: https://github.com/tndrle/node-sqlite3-wasm

/// <reference types="node" />

import events = require("events");

declare const OPEN_READONLY: number;
declare const OPEN_READWRITE: number;
declare const OPEN_CREATE: number;
declare const OPEN_FULLMUTEX: number;
declare const OPEN_SHAREDCACHE: number;
declare const OPEN_PRIVATECACHE: number;
declare const OPEN_URI: number;

declare const VERSION: string;
declare const SOURCE_ID: string;
declare const VERSION_NUMBER: number;

declare const OK: number;
declare const ERROR: number;
declare const INTERNAL: number;
declare const PERM: number;
declare const ABORT: number;
declare const BUSY: number;
declare const LOCKED: number;
declare const NOMEM: number;
declare const READONLY: number;
declare const INTERRUPT: number
declare const IOERR: number;
declare const CORRUPT: number
declare const NOTFOUND: number;
declare const FULL: number;
declare const CANTOPEN: number;
declare const PROTOCOL: number;
declare const EMPTY: number;
declare const SCHEMA: number;
declare const TOOBIG: number
declare const CONSTRAINT: number
declare const MISMATCH: number;
declare const MISUSE: number;
declare const NOLFS: number;
declare const AUTH: number
declare const FORMAT: number;
declare const RANGE: number
declare const NOTADB: number;

declare const LIMIT_LENGTH: number;
declare const LIMIT_SQL_LENGTH: number;
declare const LIMIT_COLUMN: number;
declare const LIMIT_EXPR_DEPTH: number;
declare const LIMIT_COMPOUND_SELECT: number;
declare const LIMIT_VDBE_OP: number;
declare const LIMIT_FUNCTION_ARG: number;
declare const LIMIT_ATTACHED: number;
declare const LIMIT_LIKE_PATTERN_LENGTH: number;
declare const LIMIT_VARIABLE_NUMBER: number;
declare const LIMIT_TRIGGER_DEPTH: number;
declare const LIMIT_WORKER_THREADS: number;

declare const cached: {
    Database(filename: string, callback?: (this: Database, err: Error | null) => void): Database;
    Database(filename: string, mode?: number, callback?: (this: Database, err: Error | null) => void): Database;
};

declare interface RunResult extends Statement {
    lastID: number;
    changes: number;
}

declare class Statement extends events.EventEmitter {
    bind(callback?: (err: Error | null) => void): this;
    bind(...params: any[]): this;

    reset(callback?: (err: null) => void): this;

    finalize(callback?: (err: Error) => void): Database;

    run(callback?: (err: Error | null) => void): this;
    run(params: any, callback?: (this: RunResult, err: Error | null) => void): this;
    run(...params: any[]): this;

    get<T>(callback?: (err: Error | null, row?: T) => void): this;
    get<T>(params: any, callback?: (this: RunResult, err: Error | null, row?: T) => void): this;
    get(...params: any[]): this;

    all<T>(callback?: (err: Error | null, rows: T[]) => void): this;
    all<T>(params: any, callback?: (this: RunResult, err: Error | null, rows: T[]) => void): this;
    all(...params: any[]): this;

    each<T>(callback?: (err: Error | null, row: T) => void, complete?: (err: Error | null, count: number) => void): this;
    each<T>(params: any, callback?: (this: RunResult, err: Error | null, row: T) => void, complete?: (err: Error | null, count: number) => void): this;
    each(...params: any[]): this;
}

declare class Database extends events.EventEmitter {
    constructor(filename: string, callback?: (err: Error | null) => void);
    constructor(filename: string, mode?: number, callback?: (err: Error | null) => void);

    close(callback?: (err: Error | null) => void): void;

    run(sql: string, callback?: (this: RunResult, err: Error | null) => void): this;
    run(sql: string, params: any, callback?: (this: RunResult, err: Error | null) => void): this;
    run(sql: string, ...params: any[]): this;

    get<T>(sql: string, callback?: (this: Statement, err: Error | null, row: T) => void): this;
    get<T>(sql: string, params: any, callback?: (this: Statement, err: Error | null, row: T) => void): this;
    get(sql: string, ...params: any[]): this;

    all<T>(sql: string, callback?: (this: Statement, err: Error | null, rows: T[]) => void): this;
    all<T>(sql: string, params: any, callback?: (this: Statement, err: Error | null, rows: T[]) => void): this;
    all(sql: string, ...params: any[]): this;

    each<T>(sql: string, callback?: (this: Statement, err: Error | null, row: T) => void, complete?: (err: Error | null, count: number) => void): this;
    each<T>(sql: string, params: any, callback?: (this: Statement, err: Error | null, row: T) => void, complete?: (err: Error | null, count: number) => void): this;
    each(sql: string, ...params: any[]): this;

    exec(sql: string, callback?: (this: Statement, err: Error | null) => void): this;

    prepare(sql: string, callback?: (this: Statement, err: Error | null) => void): Statement;
    prepare(sql: string, params: any, callback?: (this: Statement, err: Error | null) => void): Statement;
    prepare(sql: string, ...params: any[]): Statement;

    serialize(callback?: () => void): void;
    parallelize(callback?: () => void): void;

    on(event: "trace", listener: (sql: string) => void): this;
    on(event: "profile", listener: (sql: string, time: number) => void): this;
    on(event: "change", listener: (type: string, database: string, table: string, rowid: number) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "open" | "close", listener: () => void): this;
    on(event: string, listener: (...args: any[]) => void): this;

    configure(option: "busyTimeout", value: number): void;
    configure(option: "limit", id: number, value: number): void;

    loadExtension(filename: string, callback?: (err: Error | null) => void): this;

    wait(callback?: (param: null) => void): this;

    interrupt(): void;
}

declare function verbose(): sqlite3;

declare interface sqlite3 {
    OPEN_READONLY: number;
    OPEN_READWRITE: number;
    OPEN_CREATE: number;
    OPEN_FULLMUTEX: number;
    OPEN_SHAREDCACHE: number;
    OPEN_PRIVATECACHE: number;
    OPEN_URI: number;

    VERSION: string;
    SOURCE_ID: string;
    VERSION_NUMBER: number;

    OK: number;
    ERROR: number;
    INTERNAL: number;
    PERM: number;
    ABORT: number;
    BUSY: number;
    LOCKED: number;
    NOMEM: number;
    READONLY: number;
    INTERRUPT: number
    IOERR: number;
    CORRUPT: number
    NOTFOUND: number;
    FULL: number;
    CANTOPEN: number;
    PROTOCOL: number;
    EMPTY: number;
    SCHEMA: number;
    TOOBIG: number
    CONSTRAINT: number
    MISMATCH: number;
    MISUSE: number;
    NOLFS: number;
    AUTH: number
    FORMAT: number;
    RANGE: number
    NOTADB: number;

    LIMIT_LENGTH: number;
    LIMIT_SQL_LENGTH: number;
    LIMIT_COLUMN: number;
    LIMIT_EXPR_DEPTH: number;
    LIMIT_COMPOUND_SELECT: number;
    LIMIT_VDBE_OP: number;
    LIMIT_FUNCTION_ARG: number;
    LIMIT_ATTACHED: number;
    LIMIT_LIKE_PATTERN_LENGTH: number;
    LIMIT_VARIABLE_NUMBER: number;
    LIMIT_TRIGGER_DEPTH: number;
    LIMIT_WORKER_THREADS: number;

    cached: typeof cached;
    RunResult: RunResult;
    Statement: typeof Statement;
    Database: typeof Database;
    verbose(): this;
}