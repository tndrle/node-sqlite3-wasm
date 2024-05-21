// MIT License

// Copyright (c) 2022-2024 Tobias Enderle

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

declare module "node-sqlite3-wasm" {
  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface QueryOptions {
    expand?: boolean;
  }

  interface RawResult { 
    columns: {name: string, type: number, typeName: string, table: string, column: string}[];
    rows: SQLiteValue[][];
  }

  type SQLiteValue = number | bigint | string | Uint8Array | null;
  type JSValue = boolean | SQLiteValue;

  type BindValues = JSValue | JSValue[] | Record<string, JSValue>;

  type NormalQueryResult = Record<string, SQLiteValue>;
  type ExpandedQueryResult = Record<string, NormalQueryResult>;
  type QueryResult = NormalQueryResult | ExpandedQueryResult;

  class Database {
    constructor(
      filename?: string,
      options?: { fileMustExist?: boolean; readOnly?: boolean }
    );

    get isOpen(): boolean;
    get inTransaction(): boolean;

    close(): void;
    function(
      name: string,
      func: (...params: SQLiteValue[]) => JSValue,
      options?: { deterministic?: boolean }
    ): this;
    exec(sql: string): void;
    prepare(sql: string): Statement;
    run(sql: string, values?: BindValues): RunResult;
    all(
      sql: string,
      values?: BindValues,
      options?: QueryOptions
    ): QueryResult[];
    get(
      sql: string,
      values?: BindValues,
      options?: QueryOptions
    ): QueryResult | null;
    raw(
      sql: string,
      values?: BindValues,
    ): RawResult | null;
    
  }

  class Statement {
    get database(): Database;
    get isFinalized(): boolean;

    run(values?: BindValues): RunResult;
    iterate(
      values?: BindValues,
      options?: QueryOptions
    ): IterableIterator<QueryResult>;
    all(values?: BindValues, options?: QueryOptions): QueryResult[];
    get(values?: BindValues, options?: QueryOptions): QueryResult | null;
    raw(values?: BindValues): RawResult | null;
    finalize(): void;
  }

  class SQLite3Error extends Error {}
}
