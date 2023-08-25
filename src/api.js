// MIT License

// Copyright (c) 2022-2023 Tobias Enderle

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

// Parts of this file are taken from sql.js (https://github.com/sql-js/sql.js/),
// which is MIT licensed.

/* c8 ignore stop */

"use strict";

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

const NULL = 0;

const SQLITE_OK = 0;
const SQLITE_ROW = 100;
const SQLITE_DONE = 101;
const SQLITE_INTEGER = 1;
const SQLITE_FLOAT = 2;
const SQLITE_TEXT = 3;
const SQLITE_BLOB = 4;
const SQLITE_NULL = 5;
const SQLITE_UTF8 = 1;
const SQLITE_TRANSIENT = -1;
const SQLITE_DETERMINISTIC = 2048;

let temp;

const sqlite3 = {};

Module.onRuntimeInitialized = () => {
  temp = stackAlloc(4);

  const v = null; // return type void
  const n = "number";
  const s = "string";
  const n1 = [n];
  const n2 = [n, ...n1];
  const n3 = [n, ...n2];
  const n4 = [n, ...n3];
  const n5 = [n, ...n4];

  // Makefile will automatically export sqlite3_* functions
  const signatures = {
    open_v2: [n, [s, n, n, s]],
    exec: [n, n5],
    errmsg: [s, n1],
    prepare_v2: [n, n5],
    close_v2: [n, n1],
    finalize: [n, n1],
    reset: [n, n1],
    clear_bindings: [n, n1],
    bind_int: [n, n3],
    bind_int64: [n, n3],
    bind_double: [n, n3],
    bind_text: [n, n5],
    bind_blob: [n, n5],
    bind_blob64: [n, n5],
    bind_null: [n, n2],
    bind_parameter_index: [n, [n, s]],
    step: [n, n1],
    column_int64: [n, n2],
    column_double: [n, n2],
    column_text: [s, n2],
    column_blob: [n, n2],
    column_type: [n, n2],
    column_name: [s, n2],
    column_count: [n, n1],
    column_bytes: [n, n2],
    last_insert_rowid: [n, n1],
    changes: [n, n1],
    create_function_v2: [n, [n, s, n, n, n, n, n, n, n]],
    value_type: [n, n1],
    value_text: [s, n1],
    value_blob: [n, n1],
    value_int64: [n, n1],
    value_double: [n, n1],
    value_bytes: [n, n1],
    result_double: [v, n2],
    result_null: [v, n1],
    result_text: [v, n4],
    result_blob: [v, n4],
    result_blob64: [v, n4],
    result_int: [v, n2],
    result_int64: [v, n2],
    result_error: [v, n3],
    column_table_name: [s, n2],
    get_autocommit: [n, n1],
  };
  for (const [name, sig] of Object.entries(signatures)) {
    sqlite3[name] = cwrap(`sqlite3_${name}`, sig[0], sig[1]);
  }
};

class SQLite3Error extends Error {
  constructor(message) {
    super(message);
    this.name = "SQLite3Error";
  }
}

function arrayToHeap(array) {
  const ptr = _malloc(array.byteLength);
  HEAPU8.set(array, ptr);
  return ptr;
}

function stringToHeap(str) {
  const size = lengthBytesUTF8(str) + 1;
  const ptr = _malloc(size);
  stringToUTF8(str, ptr, size);
  return ptr;
}

function toNumberOrNot(bigInt) {
  if (bigInt >= Number.MIN_SAFE_INTEGER && bigInt <= Number.MAX_SAFE_INTEGER) {
    return Number(bigInt);
  }
  return bigInt;
}

function parseFunctionArguments(argc, argv) {
  const args = [];
  for (let i = 0; i < argc; i++) {
    const ptr = getValue(argv + 4 * i, "i32");
    const type = sqlite3.value_type(ptr);
    let arg;
    switch (type) {
      case SQLITE_INTEGER:
        arg = toNumberOrNot(sqlite3.value_int64(ptr));
        break;
      case SQLITE_FLOAT:
        arg = sqlite3.value_double(ptr);
        break;
      case SQLITE_TEXT:
        arg = sqlite3.value_text(ptr);
        break;
      case SQLITE_BLOB:
        const p = sqlite3.value_blob(ptr);
        if (p != NULL) {
          arg = HEAPU8.slice(p, p + sqlite3.value_bytes(ptr));
        } else {
          arg = new Uint8Array();
        }
        break;
      case SQLITE_NULL:
        arg = null;
        break;
    }
    args.push(arg);
  }
  return args;
}

function setFunctionResult(cx, result) {
  switch (typeof result) {
    case "boolean":
      sqlite3.result_int(cx, result ? 1 : 0);
      break;
    case "number":
      if (Number.isSafeInteger(result)) {
        if (result >= INT32_MIN && result <= INT32_MAX) {
          sqlite3.result_int(cx, result);
        } else {
          sqlite3.result_int64(cx, BigInt(result));
        }
      } else {
        sqlite3.result_double(cx, result);
      }
      break;
    case "bigint":
      sqlite3.result_int64(cx, result);
      break;
    case "string":
      const tempPtr = stringToHeap(result);
      sqlite3.result_text(cx, tempPtr, -1, SQLITE_TRANSIENT);
      _free(tempPtr);
      break;
    case "object":
      if (result === null) {
        sqlite3.result_null(cx);
      } else if (result instanceof Uint8Array) {
        const tempPtr = arrayToHeap(result);
        if (result.byteLength <= INT32_MAX) {
          sqlite3.result_blob(cx, tempPtr, result.byteLength, SQLITE_TRANSIENT);
        } else {
          sqlite3.result_blob64(
            cx,
            tempPtr,
            BigInt(result.byteLength),
            SQLITE_TRANSIENT
          );
        }
        _free(tempPtr);
      } else {
        throw new SQLite3Error(
          `Unsupported type for function result: "${typeof result}"`
        );
      }
      break;
    default:
      throw new SQLite3Error(
        `Unsupported type for function result: "${typeof result}"`
      );
  }
}

class Database {
  constructor(filename, { fileMustExist = false } = {}) {
    let flags = SQLITE_OPEN_READWRITE;
    if (!fileMustExist) flags |= SQLITE_OPEN_CREATE;
    const rc = sqlite3.open_v2(filename, temp, flags, NULL);
    this._ptr = getValue(temp, "i32");
    if (rc !== SQLITE_OK) {
      if (this._ptr !== NULL) sqlite3.close_v2(this._ptr);
      throw new SQLite3Error(`Could not open the database "${filename}"`);
    }
    this._functions = new Map();
  }

  get isOpen() {
    return this._ptr !== null;
  }

  get inTransaction() {
    this._assertOpen();
    return sqlite3.get_autocommit(this._ptr) === 0;
  }

  close() {
    this._assertOpen();

    for (const func of this._functions.values()) removeFunction(func);
    this._functions.clear();
    this._handleError(sqlite3.close_v2(this._ptr));
    this._ptr = null;
  }

  function(name, func, { deterministic = false } = {}) {
    this._assertOpen();

    // void wrappedFunc(sqlite3_context *db, int argc, sqlite3_value **argv)
    function wrappedFunc(cx, argc, argv) {
      const args = parseFunctionArguments(argc, argv);
      let result;
      try {
        result = func.apply(null, args);
      } catch (err) {
        const tempPtr = stringToHeap(err.toString());
        sqlite3.result_error(cx, tempPtr, -1);
        _free(tempPtr);
        return;
      }
      setFunctionResult(cx, result);
    }
    if (this._functions.has(name)) {
      removeFunction(this._functions.get(name));
      this._functions.delete(name);
    }
    const funcPtr = addFunction(wrappedFunc, "viii");
    this._functions.set(name, funcPtr);
    let eTextRep = SQLITE_UTF8;
    if (deterministic) eTextRep |= SQLITE_DETERMINISTIC;
    this._handleError(
      sqlite3.create_function_v2(
        this._ptr,
        name,
        func.length,
        eTextRep,
        NULL,
        funcPtr,
        NULL,
        NULL,
        NULL
      )
    );
    return this;
  }

  exec(sql) {
    this._assertOpen();
    const tempPtr = stringToHeap(sql);
    try {
      this._handleError(sqlite3.exec(this._ptr, tempPtr, NULL, NULL, NULL));
    } finally {
      _free(tempPtr);
    }
  }

  prepare(sql) {
    this._assertOpen();
    return new Statement(this, sql);
  }

  run(sql, values) {
    const stmt = this.prepare(sql);
    try {
      return stmt.run(values);
    } finally {
      stmt.finalize();
    }
  }

  all(sql, values, { expand = false } = {}) {
    return this._query(sql, values, false, expand);
  }

  get(sql, values, { expand = false } = {}) {
    return this._query(sql, values, true, expand);
  }

  _query(sql, values, single, expand) {
    const stmt = this.prepare(sql);
    try {
      if (single) {
        return stmt.get(values, { expand });
      } else {
        return stmt.all(values, { expand });
      }
    } finally {
      stmt.finalize();
    }
  }

  _assertOpen() {
    if (!this.isOpen) throw new SQLite3Error("Database already closed");
  }

  _handleError(returnCode) {
    if (returnCode !== SQLITE_OK)
      throw new SQLite3Error(sqlite3.errmsg(this._ptr));
  }
}

class Statement {
  constructor(db, sql) {
    const tempPtr = stringToHeap(sql);
    try {
      db._handleError(sqlite3.prepare_v2(db._ptr, tempPtr, -1, temp, NULL));
    } finally {
      _free(tempPtr);
    }
    this._ptr = getValue(temp, "i32");
    if (this._ptr === NULL) throw new SQLite3Error("Nothing to prepare");

    this._db = db;
  }

  get database() {
    return this._db;
  }

  get isFinalized() {
    return this._ptr === null;
  }

  run(values) {
    this._assertReady();

    this._bind(values);
    this._step();
    return {
      changes: sqlite3.changes(this._db._ptr),
      lastInsertRowid: toNumberOrNot(sqlite3.last_insert_rowid(this._db._ptr)),
    };
  }

  all(values, { expand = false } = {}) {
    return this._queryRows(values, false, expand);
  }

  get(values, { expand = false } = {}) {
    return this._queryRows(values, true, expand);
  }

  finalize() {
    if (this.isFinalized) throw new SQLite3Error("Statement already finalized");

    this._reset();
    this._db._handleError(sqlite3.finalize(this._ptr));
    this._ptr = null;
  }

  _reset() {
    return (
      sqlite3.clear_bindings(this._ptr) === SQLITE_OK &&
      sqlite3.reset(this._ptr) === SQLITE_OK
    );
  }

  _queryRows(values, single, expand) {
    this._assertReady();

    this._bind(values);
    if (single) {
      if (this._step()) {
        return this._getRow(expand);
      } else {
        return null;
      }
    } else {
      const rows = [];
      while (this._step()) rows.push(this._getRow(expand));
      return rows;
    }
  }

  _bind(values) {
    if (!this._reset()) {
      throw new SQLite3Error(
        "Could not reset statement prior to binding new values"
      );
    }
    if (Array.isArray(values)) {
      this._bindArray(values);
    } else if (values != null && typeof values === "object") {
      this._bindObject(values);
    } else if (typeof values !== "undefined") {
      this._bindValue(values, 1); // presumably only one parameter to bind
    }
  }

  _step() {
    const ret = sqlite3.step(this._ptr);
    switch (ret) {
      case SQLITE_ROW:
        return true;
      case SQLITE_DONE:
        return false;
      default:
        this._db._handleError(ret);
    }
  }

  _getRow(expand) {
    const columns = this._getColumnNames();
    const row = {};
    for (let i = 0; i < columns.length; i++) {
      let v;
      const colType = sqlite3.column_type(this._ptr, i);
      switch (colType) {
        case SQLITE_INTEGER:
          v = toNumberOrNot(sqlite3.column_int64(this._ptr, i));
          break;
        case SQLITE_FLOAT:
          v = sqlite3.column_double(this._ptr, i);
          break;
        case SQLITE_TEXT:
          v = sqlite3.column_text(this._ptr, i);
          break;
        case SQLITE_BLOB:
          const p = sqlite3.column_blob(this._ptr, i);
          if (p != NULL) {
            v = HEAPU8.slice(p, p + sqlite3.column_bytes(this._ptr, i));
          } else {
            v = new Uint8Array();
          }
          break;
        case SQLITE_NULL:
          v = null;
          break;
      }
      const column = columns[i];
      if (expand) {
        let table = sqlite3.column_table_name(this._ptr, i);
        table = table === "" ? "$" : table;
        if (Object.hasOwn(row, table)) {
          row[table][column] = v;
        } else {
          row[table] = { [column]: v };
        }
      } else {
        row[column] = v;
      }
    }
    return row;
  }

  _getColumnNames() {
    const names = [];
    const columns = sqlite3.column_count(this._ptr);
    for (let i = 0; i < columns; i++)
      names.push(sqlite3.column_name(this._ptr, i));
    return names;
  }

  _bindArray(values) {
    for (let i = 0; i < values.length; i++) this._bindValue(values[i], i + 1);
  }

  _bindObject(values) {
    for (const entry of Object.entries(values)) {
      const param = entry[0];
      const value = entry[1];
      const i = sqlite3.bind_parameter_index(this._ptr, param);
      if (i === 0)
        throw new SQLite3Error(`Unknown binding parameter: "${param}"`);
      this._bindValue(value, i);
    }
  }

  _bindValue(value, position) {
    let ret;
    switch (typeof value) {
      case "string":
        const tempPtr = stringToHeap(value);
        ret = sqlite3.bind_text(
          this._ptr,
          position,
          tempPtr,
          -1,
          SQLITE_TRANSIENT
        );
        _free(tempPtr);
        break;
      case "number":
        if (Number.isSafeInteger(value)) {
          if (value >= INT32_MIN && value <= INT32_MAX) {
            ret = sqlite3.bind_int(this._ptr, position, value);
          } else {
            ret = sqlite3.bind_int64(this._ptr, position, BigInt(value));
          }
        } else {
          ret = sqlite3.bind_double(this._ptr, position, value);
        }
        break;
      case "bigint":
        ret = sqlite3.bind_int64(this._ptr, position, value);
        break;
      case "boolean":
        ret = sqlite3.bind_int(this._ptr, position, value ? 1 : 0);
        break;
      case "object":
        if (value === null) {
          ret = sqlite3.bind_null(this._ptr, position);
        } else if (value instanceof Uint8Array) {
          const tempPtr = arrayToHeap(value);
          if (value.byteLength <= INT32_MAX) {
            ret = sqlite3.bind_blob(
              this._ptr,
              position,
              tempPtr,
              value.byteLength,
              SQLITE_TRANSIENT
            );
          } else {
            ret = sqlite3.bind_blob64(
              this._ptr,
              position,
              tempPtr,
              BigInt(value.byteLength),
              SQLITE_TRANSIENT
            );
          }
          _free(tempPtr);
        } else {
          throw new SQLite3Error(
            `Unsupported type for binding: "${typeof value}"`
          );
        }
        break;
      default:
        throw new SQLite3Error(
          `Unsupported type for binding: "${typeof value}"`
        );
    }
    if (ret !== SQLITE_OK) this._db._handleError(ret);
  }

  _assertReady() {
    if (this.isFinalized) throw new SQLite3Error("Statement already finalized");
    if (!this._db.isOpen) throw new SQLite3Error("Database is closed");
  }
}

Module.Database = Database;
Module.SQLite3Error = SQLite3Error;

/* c8 ignore start */
