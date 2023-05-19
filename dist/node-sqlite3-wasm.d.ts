export const SQLITE_OK = 0;
export const SQLITE_ROW = 100;
export const SQLITE_DONE = 101;
export const SQLITE_INTEGER = 1;
export const SQLITE_FLOAT = 2;
export const SQLITE_TEXT = 3;
export const SQLITE_BLOB = 4;
export const SQLITE_NULL = 5;
export const SQLITE_UTF8 = 1;
export const SQLITE_TRANSIENT = -1;
export const SQLITE_DETERMINISTIC = 2048;

export class SQLite3Error extends Error {
    constructor(message: any);
}

export type Row = {} 
 
export type Rows=Row[];
export interface Statement {
    get database(): Database;
    get isFinalized(): boolean;

    run(values: any): { changes: any; lastInsertRowid: BigInteger; };
    all(values: any, options?: { expand?: boolean; }): Rows;
    get(values: any, options?: { expand?: boolean; }): Row;
    finalize(): void;
}

export class Database {
    constructor(filename: string,options? : { fileMustExist?: boolean} );

    get isOpen(): boolean;
    get inTransaction(): boolean;

    close(): void;
    function(name: any, func: any, options?: { deterministic?: boolean;}): Database;
    exec(sql: string): void;
    prepare(sql: string): Statement;
    run(sql: string, values: any): {changes: any;lastInsertRowid: BigInteger;};
    all(sql: string, values: any, options?: { expand?: boolean;}): Rows;
    get(sql: string, values: any, options?: { expand?: boolean;}): Row;
}



