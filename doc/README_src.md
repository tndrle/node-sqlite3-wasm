**_node-sqlite3-wasm_**

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
persistent storage. There also exist native bindings like
[better-sqlite3](https://github.com/WiseLibs/better-sqlite3) or
[node-sqlite3](https://github.com/TryGhost/node-sqlite3). However, native
bindings must be recompiled for every target platform or pre-built binaries must
be shipped. This is tedious, especially for Electron deployments.

_node-sqlite3-wasm_ supports persistent storage by implementing a [SQLite OS
Interface or "VFS"](https://www.sqlite.org/vfs.html) that translates SQLite file
access to [Node.js' file system API](https://nodejs.org/api/fs.html).

_node-sqlite3-wasm_ is a minimal implementation, without much testing. In
particular, it does not support

- File locking
- Loading of dynamic extensions
- Temporary files (this is why _node-sqlite3-wasm_ is compiled with the
  `SQLITE_TEMP_STORE=3` flag)
- Binary large objects (BLOBs)
- BigInt

## Getting Started

To install _node-sqlite3-wasm_, run

```
npm install tndrle/node-sqlite3-wasm
```

To use it run

```js
const { Database } = require("node-sqlite3-wasm");
const db = new Database("database.db");
```

**Important:** _node-sqlite3-wasm_ is not fully garbage-collected. You **have to
manually close** a database, otherwise you risk **memory leaks** (see
[](#db.close)). Also, if you use prepared statements explicitly (see
[](#db.prepare)), you **have to manually finalize** them. Alternatively, the
[`Database`](#class database) class provides the convenience methods

- [](#db.all)
- [](#db.get)
- [](#db.run)

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

- [](#class database)
- [](#class statement)
- [](#class sqlite3error)

### `class Database`

Constructor

- [](#new database)

Methods

- [](#db.all)
- [](#db.close)
- [](#db.exec)
- [](#db.function)
- [](#db.get)
- [](#db.prepare)
- [](#db.run)

Properties

- [](#db.intransaction)
- [](#db.isopen)

### `new Database(path, [options])`

Creates a new database connection. By default, the database file is created if
it doesn't exist.

**Important:** You **have to manually close** the database, otherwise you risk
**memory leaks** (see [](#db.close)).

Arguments

- `path`: the path to the database file
- `options` (optional)
  - `fileMustExist` (default: `false`): if the database file does not exist it
    will not be created. Instead an [`SQLite3Error`](#class sqlite3error) will
    be thrown.

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
db.function("regexp", (y, x) => (new RegExp(y, "i").test(x) ? 1 : 0), {
  deterministic: true,
});
db.all("SELECT * FROM book WHERE title REGEXP ?", ".*little.*");
```

### `Database.get(sql, [values, options]) -> row`

Creates a prepared statement, executes it with the given values and returns the
first resulting row as an objects. The prepared statement is finalized
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
**memory leaks**. See [`Statement`](#class statement) and, in particular,
[](#stmt.finalize).

```js
const stmt = db.prepare("INSERT INTO book (title) VALUES (?)");
try {
  // do something with the statement here
} finally {
  stmt.finalize();
}
```

The [`Database`](#class database) class provides the convenience methods

- [](#db.all)
- [](#db.get)
- [](#db.run)

These convenience methods use a prepared statement internally and take care of
finalizing it.

### `Database.run(sql, [values]) -> info`

Creates a prepared statement, executes it with the given values and returns an
object with the properties `changes` and `lastInsertRowid` describing the number
of modified rows and the id of the last row inserted. The prepared statement is
finalized automatically.

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

- [](#stmt.all)
- [](#stmt.finalize)
- [](#stmt.get)
- [](#stmt.run)

Properties

- [](#stmt.database)
- [](#stmt.isfinalized)

**Important:** You **have to manually finalize** a statement, otherwise you risk
**memory leaks** (see [](#stmt.finalize)).

```js
const stmt = db.prepare("SELECT * FROM book WHERE id = ?");
try {
  // do something with the statement here
} finally {
  stmt.finalize();
}
```

As an alternative, the [`Database`](#class database) class provides the
convenience methods

- [](#db.all)
- [](#db.get)
- [](#db.run)

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

See also [](#db.all)

### `Statement.finalize()`

Finalizes the statement and frees all allocated memory. Once a statement has
been finalized, it cannot be used anymore.

**Important:** You **have to manually finalize** a statement, otherwise you risk
**memory leaks**.

### `Statement.get([values, options]) -> row`

Executes the prepared statement with the given values and returns the first
resulting row as an objects.

Arguments

- `values` (optional): values to bind to the statement's parameters. Either a
  single value, an array, or an object in case of named parameters.
- `options` (optional)
  - `expand` (default: `false`): if `true`, the returned row is a nested object
    with keys corresponding to tables in the query. If a result column is an
    expression or subquery, it will be returned under the key `$`.

See also [](#db.get)

### `Statement.run([values]) -> info`

Executes the prepared statement with the given values and returns an object with
the properties `changes` and `lastInsertRowid` describing the number of modified
rows and the id of the last row inserted.

Arguments

- `values` (optional): values to bind to the statement's parameters. Either a
  single value, an array, or an object in case of named parameters.

See also [](#db.run)

### `Statement.database`

The [`Database`](#class database) object that instantiated this statement.

### `Statement.isFinalized`

Property determining whether the statement has been finalized using
[](#stmt.finalize). A finalized statement must not be used anymore.

### `class SQLite3Error`

_node-sqlite3-wasm_ throws an `SQLite3Error` whenever an error in SQLite3 occurs
or when functionality is not supported (e.g. BLOBs). `SQLite3Error` is a
subclass of `Error`.

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
