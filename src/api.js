// MIT License

// Copyright (c) 2022 Tobias Enderle

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

"use strict";

const NULL = 0;

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

// Makefile will automatically export sqlite3_* functions
let sqlite3_open_v2;
let sqlite3_exec;
let sqlite3_errmsg;
let sqlite3_prepare_v2;
let sqlite3_close_v2;
let sqlite3_finalize;
let sqlite3_reset;
let sqlite3_clear_bindings;
let sqlite3_bind_int;
let sqlite3_bind_double;
let sqlite3_bind_text;
let sqlite3_bind_null;
let sqlite3_bind_parameter_index;
let sqlite3_step;
let sqlite3_column_int;
let sqlite3_column_double;
let sqlite3_column_text;
let sqlite3_column_type;
let sqlite3_column_name;
let sqlite3_column_count;
let sqlite3_last_insert_rowid;
let sqlite3_changes;
let sqlite3_create_function_v2;
let sqlite3_value_type;
let sqlite3_value_text;
let sqlite3_value_int;
let sqlite3_value_double;
let sqlite3_result_double;
let sqlite3_result_null;
let sqlite3_result_text;
let sqlite3_result_int;
let sqlite3_result_error;
let sqlite3_column_table_name;
let sqlite3_get_autocommit;

Module.onRuntimeInitialized = () => {
  temp = stackAlloc(4);

  sqlite3_open_v2 = cwrap("sqlite3_open_v2", "number", [
    "string",
    "number",
    "number",
    "string",
  ]);
  sqlite3_exec = cwrap("sqlite3_exec", "number", [
    "number",
    "string",
    "number",
    "number",
    "number",
  ]);
  sqlite3_errmsg = cwrap("sqlite3_errmsg", "string", ["number"]);
  sqlite3_prepare_v2 = cwrap("sqlite3_prepare_v2", "number", [
    "number",
    "string",
    "number",
    "number",
    "number",
  ]);
  sqlite3_close_v2 = cwrap("sqlite3_close_v2", "number", ["number"]);
  sqlite3_finalize = cwrap("sqlite3_finalize", "number", ["number"]);
  sqlite3_reset = cwrap("sqlite3_reset", "number", ["number"]);
  sqlite3_clear_bindings = cwrap("sqlite3_clear_bindings", "number", [
    "number",
  ]);
  sqlite3_bind_int = cwrap("sqlite3_bind_int", "number", [
    "number",
    "number",
    "number",
  ]);
  sqlite3_bind_double = cwrap("sqlite3_bind_double", "number", [
    "number",
    "number",
    "number",
  ]);
  sqlite3_bind_text = cwrap("sqlite3_bind_text", "number", [
    "number",
    "number",
    "string",
    "number",
    "number",
  ]);
  sqlite3_bind_null = cwrap("sqlite3_bind_null", "number", [
    "number",
    "number",
  ]);
  sqlite3_bind_parameter_index = cwrap(
    "sqlite3_bind_parameter_index",
    "number",
    ["number", "string"]
  );
  sqlite3_step = cwrap("sqlite3_step", "number", ["number"]);
  sqlite3_column_int = cwrap("sqlite3_column_int", "number", [
    "number",
    "number",
  ]);
  sqlite3_column_double = cwrap("sqlite3_column_double", "number", [
    "number",
    "number",
  ]);
  sqlite3_column_text = cwrap("sqlite3_column_text", "string", [
    "number",
    "number",
  ]);
  sqlite3_column_type = cwrap("sqlite3_column_type", "number", [
    "number",
    "number",
  ]);
  sqlite3_column_name = cwrap("sqlite3_column_name", "string", [
    "number",
    "number",
  ]);
  sqlite3_column_count = cwrap("sqlite3_column_count", "number", ["number"]);
  sqlite3_last_insert_rowid = cwrap("sqlite3_last_insert_rowid", "number", [
    "number",
  ]);
  sqlite3_changes = cwrap("sqlite3_changes", "number", ["number"]);
  sqlite3_create_function_v2 = cwrap("sqlite3_create_function_v2", "number", [
    "number",
    "string",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
  ]);
  sqlite3_value_type = cwrap("sqlite3_value_type", "number", ["number"]);
  sqlite3_value_text = cwrap("sqlite3_value_text", "string", ["number"]);
  sqlite3_value_int = cwrap("sqlite3_value_int", "number", ["number"]);
  sqlite3_value_double = cwrap("sqlite3_value_double", "number", ["number"]);
  sqlite3_result_double = cwrap("sqlite3_result_double", "", [
    "number",
    "number",
  ]);
  sqlite3_result_null = cwrap("sqlite3_result_null", "", ["number"]);
  sqlite3_result_text = cwrap("sqlite3_result_text", "", [
    "number",
    "string",
    "number",
    "number",
  ]);
  sqlite3_result_int = cwrap("sqlite3_result_int", "", ["number", "number"]);
  sqlite3_result_error = cwrap("sqlite3_result_error", "", [
    "number",
    "string",
    "number",
  ]);
  sqlite3_column_table_name = cwrap("sqlite3_column_table_name", "string", [
    "number",
    "number",
  ]);
  sqlite3_get_autocommit = cwrap("sqlite3_get_autocommit", "number", [
    "number",
  ]);
};

function isInt32(number) {
  return (
    number >= -2147483648 && number <= 2147483647 && Number.isInteger(number)
  );
}

function parseFunctionArguments(argc, argv) {
  const args = [];
  for (let i = 0; i < argc; i++) {
    const ptr = getValue(argv + 4 * i, "i32");
    const type = sqlite3_value_type(ptr);
    let arg;
    switch (type) {
      case SQLITE_INTEGER:
        arg = sqlite3_value_int(ptr);
        break;
      case SQLITE_FLOAT:
        arg = sqlite3_value_double(ptr);
        break;
      case SQLITE_TEXT:
        arg = sqlite3_value_text(ptr);
        break;
      case SQLITE_BLOB:
        throw new SQLite3Error("Type BLOB not supported");
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
      sqlite3_result_int(cx, result ? 1 : 0);
      break;
    case "number":
      if (isInt32(result)) {
        sqlite3_result_int(cx, result);
      } else {
        sqlite3_result_double(cx, result);
      }
      break;
    case "string":
      sqlite3_result_text(cx, result, -1, SQLITE_TRANSIENT);
      break;
    case "object":
      if (result === null) {
        sqlite3_result_null(cx);
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
    const rc = sqlite3_open_v2(filename, temp, flags, NULL);
    this._ptr = getValue(temp, "i32");
    if (rc !== SQLITE_OK) {
      if (this._ptr !== NULL) sqlite3_close_v2(this._ptr);
      throw new SQLite3Error(`Could not open the database "${filename}"`);
    }
    this._functions = new Map();
  }

  get isOpen() {
    return this._ptr !== null;
  }

  get inTransaction() {
    this._assertOpen();
    return sqlite3_get_autocommit(this._ptr) === 0;
  }

  close() {
    this._assertOpen();

    for (const func of this._functions.values()) removeFunction(func);
    this._functions.clear();
    this._handleError(sqlite3_close_v2(this._ptr));
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
        sqlite3_result_error(cx, err.toString(), -1);
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
      sqlite3_create_function_v2(
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
    this._handleError(sqlite3_exec(this._ptr, sql, NULL, NULL, NULL));
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
      throw new SQLite3Error(sqlite3_errmsg(this._ptr));
  }
}

class Statement {
  constructor(db, sql) {
    db._handleError(sqlite3_prepare_v2(db._ptr, sql, -1, temp, NULL));
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
      changes: sqlite3_changes(this._db._ptr),
      lastInsertRowid: _safeInt(sqlite3_last_insert_rowid(this._db._ptr)),
    };
  }

  all(values, { expand = false } = {}) {
    return this._queryRows(values, false, expand);
  }

  get(values, { expand = false } = {}) {
    return this._queryRows(values, true, expand);
  }

  finalize() {
    this._assertReady();

    this._reset();
    this._db._handleError(sqlite3_finalize(this._ptr));
    this._ptr = null;
  }

  _reset() {
    return (
      sqlite3_clear_bindings(this._ptr) === SQLITE_OK &&
      sqlite3_reset(this._ptr) === SQLITE_OK
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
    const ret = sqlite3_step(this._ptr);
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
      const colType = sqlite3_column_type(this._ptr, i);
      switch (colType) {
        case SQLITE_INTEGER:
          v = sqlite3_column_int(this._ptr, i);
          break;
        case SQLITE_FLOAT:
          v = sqlite3_column_double(this._ptr, i);
          break;
        case SQLITE_TEXT:
          v = sqlite3_column_text(this._ptr, i);
          break;
        case SQLITE_BLOB:
          throw new SQLite3Error("Column type BLOB not supported");
        case SQLITE_NULL:
          v = null;
          break;
      }
      const column = columns[i];
      if (expand) {
        let table = sqlite3_column_table_name(this._ptr, i);
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
    const columns = sqlite3_column_count(this._ptr);
    for (let i = 0; i < columns; i++)
      names.push(sqlite3_column_name(this._ptr, i));
    return names;
  }

  _bindArray(values) {
    for (let i = 0; i < values.length; i++) this._bindValue(values[i], i + 1);
  }

  _bindObject(values) {
    for (const entry of Object.entries(values)) {
      const param = entry[0];
      const value = entry[1];
      const i = sqlite3_bind_parameter_index(this._ptr, param);
      if (i === 0)
        throw new SQLite3Error(`Unknown binding parameter: "${param}"`);
      this._bindValue(value, i);
    }
  }

  _bindValue(value, position) {
    let ret;
    switch (typeof value) {
      case "string":
        ret = sqlite3_bind_text(
          this._ptr,
          position,
          value,
          -1,
          SQLITE_TRANSIENT
        );
        break;
      case "number":
        if (isInt32(value)) {
          ret = sqlite3_bind_int(this._ptr, position, value);
        } else {
          ret = sqlite3_bind_double(this._ptr, position, value);
        }
        break;
      case "boolean":
        ret = sqlite3_bind_int(this._ptr, position, value ? 1 : 0);
        break;
      case "object":
        if (value === null) {
          ret = sqlite3_bind_null(this._ptr, position);
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
