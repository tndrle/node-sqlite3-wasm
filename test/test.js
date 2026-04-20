"use strict";

const { Database } = require("../dist/node-sqlite3-wasm.js");
const assert = require("node:assert/strict");
const { describe, it, beforeEach, afterEach, before, after } = require(
  'node:test'
);
const fs = require("node:fs");

function open() {
  try {
    fs.unlinkSync("test.db");
  } catch (err) {
    if (err.code != "ENOENT") throw err;
  }
  return new Database("test.db");
}

describe("SQLite version", () => {
  it("check version", () => {
    const content = fs.readFileSync("Makefile", "utf8");
    const v = content.match(/amalgamation-(\d+)\.zip/)[1];
    const major = v[0];
    const minor = parseInt(v.substring(1, 3));
    const patch = parseInt(v.substring(3, 5));
    const des_version = `${major}.${minor}.${patch}`;

    const db = new Database();
    const act_version = db.get("SELECT sqlite_version() AS v").v;
    db.close();
    assert.strictEqual(act_version, des_version);
  });
});

describe("Open database", () => {
  let db;

  beforeEach(() => {
    db = null;
  });

  afterEach(() => {
    if (db) db.close();
  });

  it("memory database", () => {
    db = new Database(":memory:");
  });

  it("memory database (empty name)", () => {
    db = new Database("");
  });

  it("memory database (no name)", () => {
    db = new Database();
  });

  it("file database", () => {
    db = open();
  });

  it("file database (must exist)", () => {
    try {
      fs.unlinkSync("test.db");
    } catch (err) {
      if (err.code != "ENOENT") throw err;
    }
    assert.throws(() => new Database("test.db", { fileMustExist: true }), {
      name: "SQLite3Error",
      message: 'Could not open the database "test.db"',
    });
  });

  it("file database (read-only, missing file)", () => {
    assert.throws(() => new Database("missing.db", { readOnly: true }), {
      name: "SQLite3Error",
      message: 'Could not open the database "missing.db"',
    });
  });

  it("file database (read-only)", () => {
    new Database("test.db").close();
    new Database("test.db", { readOnly: true }).close();
  });
});

describe("Read-only database", () => {
  let db;

  before(() => {
    db = open();
    db.exec("CREATE TABLE a (x INTEGER)");
    db.run("INSERT INTO a VALUES (?)", 1);
    db.close();
    db = new Database("test.db", { readOnly: true });
  });

  after(() => {
    db.close();
  });

  it("read from read-only database", () => {
    assert.strictEqual(db.get("SELECT * FROM a").x, 1);
  });

  it("write to read-only database", () => {
    assert.throws(() => db.exec("CREATE TABLE b (x INTEGER)"), {
      name: "SQLite3Error",
      message: "attempt to write a readonly database",
    });
  });
});

describe("Working with closed database", () => {
  let db;

  before(() => {
    db = open();
    db.close();
  });

  it("query", () => {
    assert.throws(() => db.run("SELECT 1"), {
      name: "SQLite3Error",
      message: "Database already closed",
    });
  });
});

describe("Query basic values", () => {
  let db;

  before(() => {
    db = open();
    db.exec("CREATE TABLE a (x INTEGER)");
  });

  after(() => {
    db.close();
  });

  it("no rows", () => {
    assert.strictEqual(db.get("SELECT * FROM a"), null);
  });

  it("number", () => {
    assert.strictEqual(db.get("SELECT 5 AS x").x, 5);
    assert.strictEqual(
      db.get(`SELECT ${Number.MIN_SAFE_INTEGER} AS x`).x,
      Number.MIN_SAFE_INTEGER
    );
    assert.strictEqual(
      db.get(`SELECT ${Number.MAX_SAFE_INTEGER} AS x`).x,
      Number.MAX_SAFE_INTEGER
    );
  });

  it("bigint", () => {
    assert.strictEqual(
      db.get(`SELECT (${Number.MIN_SAFE_INTEGER} - 1) AS x`).x,
      BigInt(Number.MIN_SAFE_INTEGER) - 1n
    );
    assert.strictEqual(
      db.get(`SELECT (${Number.MAX_SAFE_INTEGER} + 1) AS x`).x,
      BigInt(Number.MAX_SAFE_INTEGER) + 1n
    );
  });

  it("string", () => {
    assert.strictEqual(db.get("SELECT 'test' AS x").x, "test");
  });

  it("null", () => {
    assert.strictEqual(db.get("SELECT NULL AS x").x, null);
  });

  it("BLOB", () => {
    assert.deepEqual(
      db.get("SELECT zeroblob(2) AS x").x,
      new Uint8Array(2)
    );
  });

  it("BLOB too big", () => {
    assert.throws(() => db.get("SELECT zeroblob(1000000001)"), {
      name: "SQLite3Error",
      message: "string or blob too big",
    });
  });

  it("invalid SQL", () => {
    assert.throws(() => db.get("SELEC 1"), {
      name: "SQLite3Error",
      message: 'near "SELEC": syntax error',
    });
  });
});

describe("Basic operations", () => {
  let db;

  before(() => {
    db = open();
  });

  after(() => {
    db.close();
  });

  it("exec()", () => {
    db.exec("CREATE TABLE IF NOT EXISTS a (x INTEGER)");
  });

  it("run()", () => {
    db.run("DROP TABLE IF EXISTS a");
  });

  it("exec() fails", () => {
    assert.throws(() => db.exec("DROP TABLE nonexistent"), {
      name: "SQLite3Error",
      message: "no such table: nonexistent",
    });
  });

  it("run() fails", () => {
    assert.throws(() => db.run("DROP TABLE nonexistent"), {
      name: "SQLite3Error",
      message: "no such table: nonexistent",
    });
  });
});

describe("Insert values", () => {
  let db;

  before(() => {
    db = open();
    db.exec("CREATE TABLE a (x INTEGER)");
  });

  after(() => {
    db.close();
  });

  it("Return of run()", () => {
    const r = db.run("INSERT INTO a VALUES(?)", 1);
    assert.strictEqual(r.changes, 1);
    assert.strictEqual(r.lastInsertRowid, 1);
  });
});

describe("Insert values - placeholders", () => {
  let db;

  before(() => {
    db = open();
    db.exec("CREATE TABLE a (x INTEGER, y INTEGER)");
  });

  after(() => {
    db.close();
  });

  it("? placeholder", () => {
    const r = db.run("INSERT INTO a VALUES(?, ?)", [1, 2]);
    assert.strictEqual(r.changes, 1);
    assert.strictEqual(r.lastInsertRowid, 1);
  });

  it("@ placeholder", () => {
    assert.strictEqual(
      db.run("INSERT INTO a VALUES(@a, @b)", { "@a": 1, "@b": 2 }).changes,
      1
    );
  });

  it(": placeholder", () => {
    assert.strictEqual(
      db.run("INSERT INTO a VALUES(:a, :b)", { ":a": 1, ":b": 2 }).changes,
      1
    );
  });

  it("$ placeholder", () => {
    assert.strictEqual(
      db.run("INSERT INTO a VALUES($a, $b)", { $a: 1, $b: 2 }).changes,
      1
    );
  });

  it("mixed placeholders", () => {
    assert.strictEqual(
      db.run("INSERT INTO a VALUES(@a, :b)", { "@a": 1, ":b": 2 }).changes,
      1
    );
  });

  it("wrong placeholders", () => {
    assert.throws(
      () => db.run("INSERT INTO a VALUES(@a, :b)", { ":a": 1, ":b": 2 }),
      {
        name: "SQLite3Error",
        message: 'Unknown binding parameter: ":a"',
      }
    );
  });
});

describe("Insert values - types", () => {
  let db;

  before(() => {
    db = open();
    db.exec("CREATE TABLE a (w BLOB, x INTEGER, y REAL, z TEXT)");
  });

  after(() => {
    db.close();
  });

  it("insert object", () => {
    assert.throws(
      () => db.run("INSERT INTO a (w) VALUES (?)", [{ a: 1 }]),
      {
        name: "SQLite3Error",
        message: 'Unsupported type for binding: "object"',
      }
    );
  });

  it("insert undefined", () => {
    assert.throws(
      () => db.run("INSERT INTO a (x) VALUES (?)", [undefined]),
      {
        name: "SQLite3Error",
        message: 'Unsupported type for binding: "undefined"',
      }
    );
  });

  it("insert null", () => {
    assert.strictEqual(
      db.run("INSERT INTO a (x) VALUES (?)", null).changes,
      1
    );
  });

  it("insert boolean", () => {
    assert.strictEqual(
      db.run("INSERT INTO a (x) VALUES (?)", true).changes,
      1
    );
    assert.strictEqual(
      db.run("INSERT INTO a (x) VALUES (?)", false).changes,
      1
    );
  });

  it("insert number", () => {
    assert.strictEqual(
      db.run("INSERT INTO a (x) VALUES (?)", 1).changes,
      1
    );
    assert.strictEqual(
      db.run("INSERT INTO a (x) VALUES (?)", 2147483648).changes,
      1
    );
    assert.strictEqual(
      db.run("INSERT INTO a (y) VALUES (?)", 1.2).changes,
      1
    );
  });

  it("insert bigint", () => {
    assert.strictEqual(
      db.run("INSERT INTO a (x) VALUES (?)", 1n).changes,
      1
    );
  });

  it("insert text", () => {
    assert.strictEqual(
      db.run("INSERT INTO a (z) VALUES (?)", "a").changes,
      1
    );
  });

  it("insert BLOB as single parameter", () => {
    assert.throws(
      () => db.run("INSERT INTO a (w) VALUES (?)", new Uint8Array(1)),
      {
        name: "SQLite3Error",
        message: 'Unknown binding parameter: "0"',
      }
    );
  });

  it("insert BLOB", () => {
    assert.strictEqual(
      db.run("INSERT INTO a (w) VALUES (?)", [new Uint8Array(1)]).changes,
      1
    );
  });
});

describe("Insert values - missing parameters", () => {
  let db;

  before(() => {
    db = open();
    db.exec("CREATE TABLE a (x INTEGER)");
    db.exec("CREATE TABLE b (x INTEGER NOT NULL)");
  });

  after(() => {
    db.close();
  });

  it("insert with missing parameter", () => {
    assert.strictEqual(db.run("INSERT INTO a VALUES (?)").changes, 1);
  });

  it("insert with missing parameter NOT NULL", () => {
    assert.throws(() => db.run("INSERT INTO b (x) VALUES (?)"), {
      name: "SQLite3Error",
      message: "NOT NULL constraint failed: b.x",
    });
  });
});

describe("Query values", () => {
  let db;

  before(() => {
    db = open();
    db.exec("CREATE TABLE a (x TEXT, y TEXT)");
    db.run("INSERT INTO a VALUES (?, ?)", ["x", "y"]);
    db.run("INSERT INTO a VALUES (?, ?)", ["a", "b"]);
    db.exec("CREATE TABLE b (x BLOB)");
    db.run("INSERT INTO b VALUES (?)", [new Uint8Array()]);
    db.run("INSERT INTO b VALUES (?)", [new Uint8Array([4, 5, 6])]);
  });

  after(() => {
    db.close();
  });

  it("query all", () => {
    assert.deepEqual(db.all("SELECT * FROM a"), [
      { x: "x", y: "y" },
      { x: "a", y: "b" },
    ]);
  });

  it("query expanded", () => {
    assert.deepEqual(
      db.get("SELECT * FROM a", undefined, { expand: true }),
      { a: { x: "x", y: "y" } }
    );
  });

  it("expression and expand -> $", () => {
    assert.deepEqual(
      db.get("SELECT sin(0)", undefined, { expand: true }),
      { $: { "sin(0)": 0 } }
    );
  });

  it("query BLOB", () => {
    assert.deepEqual(db.all("SELECT * FROM b"), [
      { x: new Uint8Array() },
      { x: new Uint8Array([4, 5, 6]) },
    ]);
  });
});

describe("Prepared statements", () => {
  let db;

  before(() => {
    db = open();
    db.exec("CREATE TABLE a (x INTEGER)");
  });

  after(() => {
    if (db.isOpen) db.close();
  });

  it("iterate", () => {
    const stmt = db.prepare("SELECT * FROM (VALUES (1), (2))");
    assert.strictEqual(stmt.iterate().next().value.column1, 1);

    const i = stmt.iterate();
    assert.strictEqual(i.next().value.column1, 1);
    assert.strictEqual(i.next().value.column1, 2);
    assert.strictEqual(i.next().done, true);

    let x = 1;
    for (const e of stmt.iterate()) {
      assert.strictEqual(e.column1, x);
      x++;
    }

    assert.deepEqual(Array.from(stmt.iterate()), [
      { column1: 1 },
      { column1: 2 },
    ]);

    stmt.finalize();
  });

  it("iterate empty", () => {
    const stmt = db.prepare("SELECT * FROM a");
    assert.strictEqual(stmt.iterate().next().done, true);
    stmt.finalize();
  });

  it("database property", () => {
    const stmt = db.prepare("SELECT 1");
    assert.strictEqual(stmt.database, db);
    stmt.finalize();
  });

  it("already finalized", () => {
    const stmt = db.prepare("SELECT 1");
    stmt.finalize();
    assert.throws(() => stmt.run(), {
      name: "SQLite3Error",
      message: "Statement already finalized",
    });
  });

  it("empty statement", () => {
    assert.throws(() => db.prepare(""), {
      name: "SQLite3Error",
      message: "Nothing to prepare",
    });
  });

  it("multiple calls to finalize()", () => {
    const stmt = db.prepare("SELECT 1");
    stmt.finalize();
    assert.throws(() => stmt.finalize(), {
      name: "SQLite3Error",
      message: "Statement already finalized",
    });
  });

  it("database already closed", () => {
    const stmt = db.prepare("SELECT 1");
    db.close();
    assert.throws(() => stmt.run(), {
      name: "SQLite3Error",
      message: "Database is closed",
    });
    stmt.finalize();
  });
});

describe("User-defined functions", () => {
  let db;

  before(() => {
    db = open();
    db.function("identity", (x) => x);
    db.function("throwerror", () => {
      throw "Custom error";
    });
    db.function("undefinedreturn", () => undefined);
    // test redefinition of existing function
    db.function("undefinedreturn", () => undefined);
    db.function("boolreturn", (x) => (x == 1 ? true : false));
    db.function(
      "objectreturn",
      () => {
        return {
          a: 0,
        };
      },
      { deterministic: true }
    );
  });

  after(() => {
    db.close();
  });

  it("identity function - null", () => {
    assert.strictEqual(db.get("SELECT identity(?) AS r", null).r, null);
    assert.strictEqual(db.get("SELECT identity(NULL) AS r").r, null);
  });

  it("identity function - boolean", () => {
    assert.strictEqual(db.get("SELECT identity(?) AS r", true).r, 1);
    assert.strictEqual(db.get("SELECT identity(?) AS r", false).r, 0);
  });

  it("identity function - numbers", () => {
    assert.strictEqual(db.get("SELECT identity(1) AS r").r, 1);
    assert.strictEqual(db.get("SELECT identity(1.2) AS r").r, 1.2);
    assert.strictEqual(
      db.get("SELECT identity(?) AS r", Number.MAX_SAFE_INTEGER + 1).r,
      Number.MAX_SAFE_INTEGER + 1
    );
    assert.strictEqual(
      db.get("SELECT identity(10000000000) AS r").r,
      10000000000
    );
  });

  it("identity function - bigint", () => {
    assert.strictEqual(db.get("SELECT identity(?) AS r", 1n).r, 1);
    assert.strictEqual(
      db.get(
        "SELECT identity(?) AS r",
        BigInt(Number.MAX_SAFE_INTEGER) + 1n
      ).r,
      BigInt(Number.MAX_SAFE_INTEGER) + 1n
    );
    assert.strictEqual(
      db.get("SELECT identity(100000000000000000) AS r").r,
      100000000000000000n
    );
  });

  it("identity function - BLOB", () => {
    assert.deepEqual(
      db.get("SELECT identity(?) AS r", [new Uint8Array([1, 2, 3])]).r,
      new Uint8Array([1, 2, 3])
    );
    assert.deepEqual(
      db.get("SELECT identity(?) AS r", [new Uint8Array([])]).r,
      new Uint8Array([])
    );
  });

  it("identity function - text", () => {
    assert.strictEqual(db.get("SELECT identity(?) AS r", "a").r, "a");
  });

  it("return boolean", () => {
    assert.strictEqual(db.get("SELECT boolreturn(1) AS r").r, 1);
    assert.strictEqual(db.get("SELECT boolreturn(0) AS r").r, 0);
  });

  it("return object", () => {
    assert.throws(() => db.get("SELECT objectreturn()"), {
      name: "SQLite3Error",
      message: 'Unsupported type for function result: "object"',
    });
  });

  it("return undefined", () => {
    assert.throws(() => db.get("SELECT undefinedreturn()"), {
      name: "SQLite3Error",
      message: 'Unsupported type for function result: "undefined"',
    });
  });

  it("throw error", () => {
    assert.throws(() => db.get("SELECT throwerror()"), {
      name: "SQLite3Error",
      message: "Custom error",
    });
  });
});

describe("Transaction", () => {
  let db;

  before(() => {
    db = open();
    db.exec("CREATE TABLE a (x INTEGER)");
  });

  after(() => {
    db.close();
  });

  it("inTransaction", () => {
    const stmt = db.prepare("INSERT INTO a VALUES (?)");
    assert.strictEqual(db.inTransaction, false);
    db.exec("BEGIN TRANSACTION");
    assert.strictEqual(db.inTransaction, true);
    stmt.run(1);
    db.exec("COMMIT");
    assert.strictEqual(db.inTransaction, false);
    stmt.finalize();
  });
});

describe("FTS5", () => {
  let db;

  before(() => {
    db = open();
    db.exec("CREATE VIRTUAL TABLE t USING FTS5(a, b)");
    db.exec(`INSERT INTO t (a, b) VALUES
      ('this is a test', 'another test'),
      ('second test', 'nothing'),
      ('nothing', 'really')`);
  });

  after(() => {
    db.close();
  });

  it("search", () => {
    assert.deepEqual(db.all("SELECT * FROM t WHERE t MATCH 'test'"), [
      {
        a: "this is a test",
        b: "another test",
      },
      {
        a: "second test",
        b: "nothing",
      },
    ]);
  });
});

describe("DBSTAT virtual table", () => {
  let db;

  before(() => {
    db = open();
  });

  after(() => {
    db.close();
  });

  it("exists", () => {
    assert.strictEqual(db.get("SELECT * FROM dbstat"), null);
  });
});

describe("Large BLOBs and strings", () => {
  const str = "a".repeat(100_000);
  let db;

  before(() => {
    db = open();
    db.exec("CREATE TABLE a (x BLOB)");
    db.exec("CREATE TABLE b (x TEXT)");
    db.exec("CREATE TABLE c (x TEXT)");
    db.function("identity", (x) => x);
  });

  after(() => {
    db.close();
  });

  it("BLOB", () => {
    const data = new TextEncoder().encode(str);
    db.run("INSERT INTO a VALUES(?)", [data]);
    assert.deepEqual(db.get("SELECT x FROM a").x, data);
  });

  it("string", () => {
    db.run("INSERT INTO b VALUES(?)", str);
    assert.strictEqual(db.get("SELECT x FROM b").x, str);
    assert.strictEqual(db.get("SELECT ? AS r", str).r, str);
  });

  it("function", () => {
    assert.strictEqual(
      db.get("SELECT identity(?) AS r", str).r,
      str
    );
  });

  it("exec", () => {
    db.exec(`INSERT INTO c VALUES('${str}')`);
    assert.strictEqual(db.get("SELECT x FROM c").x, str);
  });
});

describe("Low-level errors", () => {
  let db;

  before(() => {
    db = open();
  });

  after(() => {
    db.close();
  });

  it("invalid bind", () => {
    const stmt = db.prepare("SELECT 1");
    assert.throws(() => stmt._bindValue(0, 1), {
      name: "SQLite3Error",
      message: "column index out of range",
    });
    stmt.finalize();
  });
});

describe("VFS", () => {
  let db;

  before(() => {
    db = open();
    db.exec("CREATE TABLE a (x INTEGER)");
  });

  after(() => {
    db.close();
  });

  it("lock already exists", () => {
    fs.mkdirSync("test.db.lock");
    assert.throws(() => db.run("INSERT INTO a VALUES (?)", 1), {
      name: "SQLite3Error",
      message: "database is locked",
    });
    fs.rmSync("test.db.lock", { recursive: true, force: true });
  });
});
