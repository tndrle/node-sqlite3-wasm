**_node-sqlite3-wasm_**

[![npm](https://img.shields.io/npm/v/node-sqlite3-wasm.svg)](https://www.npmjs.com/package/node-sqlite3-wasm)
[![SQLite](https://img.shields.io/badge/SQLite-3.47.2-blue)](https://www.sqlite.org/index.html)

# WebAssembly build of SQLite3 for Node.js

**_node-sqlite3-wasm_** is a port of [SQLite3](https://www.sqlite.org/) to
[WebAssembly](https://webassembly.org/) for [Node.js](https://nodejs.org/) with
file system access. _node-sqlite3-wasm_ brings
[SQLite3](https://www.sqlite.org/) to your [Node.js](https://nodejs.org/)
environment without recompiling on every target platform. This is especially
useful for [Electron](https://www.electronjs.org/) applications.

The port to WebAssembly that SQLite introduced in version 3.40.0 only targets
web browsers but not Node.js. Other WebAssembly ports also target Node.js, most
notably [sql.js](https://github.com/sql-js/sql.js/), but none supports
persistent storage with direct file access. There also exist native bindings
like [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) or
[node-sqlite3](https://github.com/TryGhost/node-sqlite3). However, native
bindings must be recompiled for every target platform or pre-built binaries must
be shipped. This is tedious, especially for Electron deployments.

_node-sqlite3-wasm_ supports persistent storage with direct file access by
implementing an [SQLite OS Interface or "VFS"](https://www.sqlite.org/vfs.html)
that translates SQLite file access to [Node.js' file system
API](https://nodejs.org/api/fs.html).

_node-sqlite3-wasm_ is currently based on SQLite 3.47.2.

## Getting Started

To install _node-sqlite3-wasm_, run

```
npm install node-sqlite3-wasm
```

To use it, run

```js
const { Database } = require("node-sqlite3-wasm");
const db = new Database("database.db");
```

**Important:** _node-sqlite3-wasm_ is not fully garbage-collected. You **have to
manually close** a database, otherwise you risk **memory leaks** (see
[`Database.close()`](#databaseclose)). Also, if you use prepared statements explicitly (see
[`Database.prepare()`](#databasepreparesql---statement)), you **have to manually finalize** them. Alternatively, the
[``Database``](#class-database) class provides the convenience methods

- [`Database.all()`](#databaseallsql-values-options---rows)
- [`Database.get()`](#databasegetsql-values-options---row)
- [`Database.run()`](#databaserunsql-values---info)

These convenience methods use a prepared statement internally and take care of
finalizing it.

**Note:** Foreign key support is enabled by default.

## Example

```js
const { Database } = require("node-sqlite3-wasm");
const db = new Database("database.db");

db.exec(
  "DROP TABLE IF EXISTS employees; " +
    "CREATE TABLE IF NOT EXISTS employees (name TEXT, salary INTEGER)"
);

db.run("INSERT INTO employees VALUES (:n, :s)", {
  ":n": "James",
  ":s": 50000,
});

const r = db.all("SELECT * from employees");
console.log(r);
// [ { name: 'James', salary: 50000 } ]

db.close();
```

## API

- [`class Database`](#class-database)
- [`class Statement`](#class-statement)
- [`class SQLite3Error`](#class-sqlite3error)

### `class Database`

Constructor

- [`new Database()`](#new-databasepath-options)

Methods

- [`Database.all()`](#databaseallsql-values-options---rows)
- [`Database.close()`](#databaseclose)
- [`Database.exec()`](#databaseexecsql)
- [`Database.function()`](#databasefunctionname-func-options---this)
- [`Database.get()`](#databasegetsql-values-options---row)
- [`Database.prepare()`](#databasepreparesql---statement)
- [`Database.run()`](#databaserunsql-values---info)

Properties

- [`Database.inTransaction`](#databaseintransaction)
- [`Database.isOpen`](#databaseisopen)

### `new Database(path, [options])`

Creates a new database connection. By default, the database file is created if
it doesn't exist.

**Important:** You **have to manually close** the database, otherwise you risk
**memory leaks** (see [`Database.close()`](#databaseclose)).

Arguments

- `path`: the path to the database file
- `options` (optional)
  - `fileMustExist` (default: `false`): if the database file does not exist it
    will not be created. Instead an [``SQLite3Error``](#class-sqlite3error) will
    be thrown. This option is ignored if `readOnly` is `true`.
  - `readOnly` (default: `false`): opens the database in read-only mode

```js
const db = new Database("database.db");
```

```js
const db = new Database("database.db", { fileMustExist: true });
```

### `Database.all(sql, [values, options]) -> rows`

Creates a prepared statement, executes it with the given values and returns the
resulting rows as an array of objects. The prepared statement is finalized
automatically.

Arguments

- `sql`: string containing the SQL statement
- `values` (optional): values to bind to the statement's parameters. Either a
  single value, an array, or an object in case of named parameters.
- `options` (optional)
  - `expand` (default: `false`): if `true`, each returned row is a nested object
    with keys corresponding to tables in the query. If a result column is an
    expression or subquery, it will be returned under the key `$`.

```js
db.all("SELECT * FROM book");
```

```js
db.all("SELECT * FROM book WHERE title = ?", "The Little Prince");
```

```js
db.all("SELECT * FROM book WHERE title = :t", { ":t": "The Little Prince" });
```

```js
db.all("SELECT * FROM book WHERE title IN (?, ?)", [
  "The Little Prince",
  "The Hobbit",
]);
```

### `Database.close()`

Closes the database.

**Important:** You **have to manually close** the database, otherwise you risk
**memory leaks**.

**Important:** Closing the database with [`Database.close()`](#databaseclose) does not automatically
finalize pending prepared statements.

```js
db.close();
```

### `Database.exec(sql)`

Executes the given SQL string. The SQL string may contain several
semicolon-separated statements.

```js
db.exec(
  "DROP TABLE IF EXISTS book; CREATE TABLE book (id INTEGER PRIMARY KEY, title TEXT)"
);
```

### `Database.function(name, func, [options]) -> this`

Registers a user-defined function.

Arguments

- `name`: the name of the function
- `func`: the implementation of the function
- `options` (optional)
  - `deterministic` (default: `false`): if `true`, the function is considered
    [deterministic](https://www.sqlite.org/deterministic.html)

```js
db.function("regexp", (y, x) => new RegExp(y, "i").test(x), {
  deterministic: true,
});
db.all("SELECT * FROM book WHERE title REGEXP ?", ".*little.*");
```

### `Database.get(sql, [values, options]) -> row`

Creates a prepared statement, executes it with the given values and returns the
first resulting row as an object. The prepared statement is finalized
automatically.

Arguments

- `sql`: string containing the SQL statement
- `values` (optional): values to bind to the statement's parameters. Either a
  single value, an array, or an object in case of named parameters.
- `options` (optional)
  - `expand` (default: `false`): if `true`, the returned row is a nested object
    with keys corresponding to tables in the query. If a result column is an
    expression or subquery, it will be returned under the key `$`.

```js
db.get("SELECT * FROM book WHERE id = ?", 7);
```

```js
db.get("SELECT * FROM book WHERE id = $id", { $id: 7 });
```

```js
db.get("SELECT * FROM book WHERE id = ? AND title = ?", [
  3,
  "The Little Prince",
]);
```

### `Database.prepare(sql) -> Statement`

Creates a prepared statement from the given SQL string.

**Important:** You **have to manually finalize** a statement, otherwise you risk
**memory leaks**. See [``Statement``](#class-statement) and, in particular,
[`Statement.finalize()`](#statementfinalize).

```js
const stmt = db.prepare("INSERT INTO book (title) VALUES (?)");
try {
  // do something with the statement here
} finally {
  stmt.finalize();
}
```

The [``Database``](#class-database) class provides the convenience methods

- [`Database.all()`](#databaseallsql-values-options---rows)
- [`Database.get()`](#databasegetsql-values-options---row)
- [`Database.run()`](#databaserunsql-values---info)

These convenience methods use a prepared statement internally and take care of
finalizing it.

### `Database.run(sql, [values]) -> info`

Creates a prepared statement, executes it with the given values and returns an
object with the properties `changes` and `lastInsertRowid` describing the number
of modified rows and the id of the last row inserted. `lastInsertRowid` is a
[`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
if its value exceeds
[`Number.MAX_SAFE_INTEGER`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER).
The prepared statement is finalized automatically.

Arguments

- `sql`: string containing the SQL statement
- `values` (optional): values to bind to the statement's parameters. Either a
  single value, an array, or an object in case of named parameters.

```js
db.run("INSERT INTO book (title) VALUES (?)", "The Little Prince");
```

```js
db.run("INSERT INTO book VALUES (?, ?)", [10, "The Little Prince"]);
```

```js
db.run("INSERT INTO book VALUES (@id, :title)", {
  "@id": 10,
  ":title": "The Little Prince",
});
```

### `Database.inTransaction`

Property determining whether the database is currently in a transaction.

```js
const stmt = db.prepare("INSERT INTO book (title) VALUES (?)");
try {
  db.exec("BEGIN TRANSACTION");
  stmt.run("The Little Prince");
  stmt.run("The Hobbit");
  db.exec("COMMIT");
} catch (err) {
  if (db.inTransaction) db.exec("ROLLBACK");
  console.log(err);
} finally {
  stmt.finalize();
}
```

### `Database.isOpen`

Property determining whether the database is currently open.

### `class Statement`

Methods

- [`Statement.all()`](#statementallvalues-options---rows)
- [`Statement.finalize()`](#statementfinalize)
- [`Statement.get()`](#statementgetvalues-options---row)
- [`Statement.iterate()`](#statementiteratevalues-options---iterableiteratorrow)
- [`Statement.run()`](#statementrunvalues---info)

Properties

- [`Statement.database`](#statementdatabase)
- [`Statement.isFinalized`](#statementisfinalized)

**Important:** You **have to manually finalize** a statement, otherwise you risk
**memory leaks** (see [`Statement.finalize()`](#statementfinalize)).

```js
const stmt = db.prepare("SELECT * FROM book WHERE id = ?");
try {
  // do something with the statement here
} finally {
  stmt.finalize();
}
```

As an alternative, the [``Database``](#class-database) class provides the
convenience methods

- [`Database.all()`](#databaseallsql-values-options---rows)
- [`Database.get()`](#databasegetsql-values-options---row)
- [`Database.run()`](#databaserunsql-values---info)

These convenience methods use a prepared statement internally and take care of
finalizing it.

### `Statement.all([values, options]) -> rows`

Executes the prepared statement with the given values and returns the resulting
rows as an array of objects.

Arguments

- `values` (optional): values to bind to the statement's parameters. Either a
  single value, an array, or an object in case of named parameters.
- `options` (optional)
  - `expand` (default: `false`): if `true`, each returned row is a nested object
    with keys corresponding to tables in the query. If a result column is an
    expression or subquery, it will be returned under the key `$`.

See also [`Database.all()`](#databaseallsql-values-options---rows)

### `Statement.finalize()`

Finalizes the statement and frees all allocated memory. Once a statement has
been finalized, it cannot be used anymore.

**Important:** You **have to manually finalize** a statement, otherwise you risk
**memory leaks**.

**Important:** Closing the database with [`Database.close()`](#databaseclose) does not automatically
finalize pending prepared statements.

### `Statement.get([values, options]) -> row`

Executes the prepared statement with the given values and returns the first
resulting row as an object.

Arguments

- `values` (optional): values to bind to the statement's parameters. Either a
  single value, an array, or an object in case of named parameters.
- `options` (optional)
  - `expand` (default: `false`): if `true`, the returned row is a nested object
    with keys corresponding to tables in the query. If a result column is an
    expression or subquery, it will be returned under the key `$`.

See also [`Database.get()`](#databasegetsql-values-options---row)

### `Statement.iterate([values, options]) -> IterableIterator<row>`

Executes the prepared statement with the given values and returns the resulting
rows as an iterator of objects.

Arguments

- `values` (optional): values to bind to the statement's parameters. Either a
  single value, an array, or an object in case of named parameters.
- `options` (optional)
  - `expand` (default: `false`): if `true`, each returned row is a nested object
    with keys corresponding to tables in the query. If a result column is an
    expression or subquery, it will be returned under the key `$`.

### `Statement.run([values]) -> info`

Executes the prepared statement with the given values and returns an object with
the properties `changes` and `lastInsertRowid` describing the number of modified
rows and the id of the last row inserted. `lastInsertRowid` is a
[`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
if its value exceeds
[`Number.MAX_SAFE_INTEGER`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER).

Arguments

- `values` (optional): values to bind to the statement's parameters. Either a
  single value, an array, or an object in case of named parameters.

See also [`Database.run()`](#databaserunsql-values---info)

### `Statement.database`

The [``Database``](#class-database) object that instantiated this statement.

### `Statement.isFinalized`

Property determining whether the statement has been finalized using
[`Statement.finalize()`](#statementfinalize). A finalized statement must not be used anymore.

### `class SQLite3Error`

_node-sqlite3-wasm_ throws an `SQLite3Error` whenever an error in SQLite
or in the API occurs. `SQLite3Error` is a subclass of `Error`.

## Notes About Types

### Numbers

JavaScript's
[`Number`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number?retiredLocale=de)
type is a double-precision 64-bit binary format IEEE 754 value. Integers can
only be represented without loss of precision in the range -2<sup>53</sup> + 1
to 2<sup>53</sup> - 1, inclusive. SQLite3 works with [8-byte signed
integers](https://www.sqlite.org/datatype3.html) with a range of -2<sup>63</sup>
to 2<sup>63</sup> - 1, inclusive. Since this range exceeds the range of safe
integers in JavaScript, _node-sqlite3-wasm_ automatically converts integers
outside this safe range to
[`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt).
It is your responsibility to ensure that you handle the returned values, whether
`Number` or `BigInt`, correctly. _node-sqlite3-wasm_ also allows you to input
`BigInt` values as query parameters, or arguments or return values of
user-defined functions.

### Binary Large Objects (BLOBs)

An SQLite Binary Large Object (BLOB) is represented by a
[`Uint8Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array)
in JavaScript.

## Building

[Docker](https://www.docker.com) and [npm](https://www.npmjs.com) are required
for building. [Mocha](https://mochajs.org) is required to run tests.

To build _node-sqlite3-wasm_, simply run

```
npm run build
```

This will download the [emscripten Docker
image](https://hub.docker.com/r/emscripten/emsdk) and the [SQLite source
files](https://www.sqlite.org/download.html). Then it will compile the project
source files and generate `dist/node-sqlite3-wasm.js` and
`dist/node-sqlite3-wasm.wasm`.

## License

_node-sqlite3-wasm_ is
[MIT](https://github.com/tndrle/node-sqlite3-wasm/blob/main/LICENSE) licensed.

Parts of the code are from [sql.js](https://github.com/sql-js/sql.js), which is
also MIT licensed. SQLite is in the [public
domain](https://www.sqlite.org/copyright.html).
