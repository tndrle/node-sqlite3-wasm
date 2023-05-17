"use strict";

const { Database, SQLite3Error } = require("../dist/node-sqlite3-wasm.js");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function open() {
  try {
    fs.unlinkSync("test.db");
  } catch (err) {
    if (err.code != "ENOENT") throw err;
  }
  return new Database("test.db");
}

describe("SQLite version", function () {
  it("check version", function () {
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

describe("Open database", function () {
  beforeEach(function () {
    this.db = null;
  });

  afterEach(function () {
    if (this.db != null) this.db.close();
  });

  it("memory database", function () {
    this.db = new Database(":memory:");
  });

  it("memory database (empty name)", function () {
    this.db = new Database("");
  });

  it("memory database (no name)", function () {
    this.db = new Database();
  });

  it("file database", function () {
    this.db = open();
  });

  it("file database (must exist)", function () {
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
});

describe("Working with closed database", function () {
  before(function () {
    this.db = open();
    this.db.close();
  });

  it("query", function () {
    assert.throws(() => this.db.run("SELECT 1"), {
      name: "SQLite3Error",
      message: "Database already closed",
    });
  });
});

describe("Query basic values", function () {
  before(function () {
    this.db = open();
    this.db.exec("CREATE TABLE a (x INTEGER)");
  });

  after(function () {
    this.db.close();
  });

  it("no rows", function () {
    assert.strictEqual(this.db.get("SELECT * FROM a"), null);
  });

  it("number", function () {
    assert.strictEqual(this.db.get("SELECT 5 AS x").x, 5);
    assert.strictEqual(
      this.db.get(`SELECT ${Number.MIN_SAFE_INTEGER} AS x`).x,
      Number.MIN_SAFE_INTEGER
    );
    assert.strictEqual(
      this.db.get(`SELECT ${Number.MAX_SAFE_INTEGER} AS x`).x,
      Number.MAX_SAFE_INTEGER
    );
  });

  it("bigint", function () {
    assert.strictEqual(
      this.db.get(`SELECT (${Number.MIN_SAFE_INTEGER} - 1) AS x`).x,
      BigInt(Number.MIN_SAFE_INTEGER) - 1n
    );
    assert.strictEqual(
      this.db.get(`SELECT (${Number.MAX_SAFE_INTEGER} + 1) AS x`).x,
      BigInt(Number.MAX_SAFE_INTEGER) + 1n
    );
  });

  it("string", function () {
    assert.strictEqual(this.db.get("SELECT 'test' AS x").x, "test");
  });

  it("null", function () {
    assert.strictEqual(this.db.get("SELECT NULL AS x").x, null);
  });

  it("BLOB", function () {
    assert.deepEqual(
      this.db.get("SELECT zeroblob(2) AS x").x,
      new Uint8Array(2)
    );
  });

  it("BLOB too big", function () {
    assert.throws(() => this.db.get("SELECT zeroblob(1000000001)"), {
      name: "SQLite3Error",
      message: "string or blob too big",
    });
  });

  it("invalid SQL", function () {
    assert.throws(() => this.db.get("SELEC 1"), {
      name: "SQLite3Error",
      message: 'near "SELEC": syntax error',
    });
  });
});

describe("Basic operations", function () {
  before(function () {
    this.db = open();
  });

  after(function () {
    this.db.close();
  });

  it("exec()", function () {
    this.db.exec("CREATE TABLE IF NOT EXISTS a (x INTEGER)");
  });

  it("run()", function () {
    this.db.run("DROP TABLE IF EXISTS a");
  });

  it("exec() fails", function () {
    assert.throws(() => this.db.exec("DROP TABLE nonexistent"), {
      name: "SQLite3Error",
      message: "no such table: nonexistent",
    });
  });

  it("run() fails", function () {
    assert.throws(() => this.db.run("DROP TABLE nonexistent"), {
      name: "SQLite3Error",
      message: "no such table: nonexistent",
    });
  });
});

describe("Insert values", function () {
  before(function () {
    this.db = open();
    this.db.exec("CREATE TABLE a (x INTEGER)");
  });

  after(function () {
    this.db.close();
  });

  it("Return of run()", function () {
    const r = this.db.run("INSERT INTO a VALUES(?)", 1);
    assert.strictEqual(r.changes, 1);
    assert.strictEqual(r.lastInsertRowid, 1);
  });
});

describe("Insert values - placeholders", function () {
  before(function () {
    this.db = open();
    this.db.exec("CREATE TABLE a (x INTEGER, y INTEGER)");
  });

  after(function () {
    this.db.close();
  });

  it("? placeholder", function () {
    const r = this.db.run("INSERT INTO a VALUES(?, ?)", [1, 2]);
    assert.strictEqual(r.changes, 1);
    assert.strictEqual(r.lastInsertRowid, 1);
  });

  it("@ placeholder", function () {
    assert.strictEqual(
      this.db.run("INSERT INTO a VALUES(@a, @b)", { "@a": 1, "@b": 2 }).changes,
      1
    );
  });

  it(": placeholder", function () {
    assert.strictEqual(
      this.db.run("INSERT INTO a VALUES(:a, :b)", { ":a": 1, ":b": 2 }).changes,
      1
    );
  });

  it("$ placeholder", function () {
    assert.strictEqual(
      this.db.run("INSERT INTO a VALUES($a, $b)", { $a: 1, $b: 2 }).changes,
      1
    );
  });

  it("mixed placeholders", function () {
    assert.strictEqual(
      this.db.run("INSERT INTO a VALUES(@a, :b)", { "@a": 1, ":b": 2 }).changes,
      1
    );
  });

  it("wrong placeholders", function () {
    assert.throws(
      () => this.db.run("INSERT INTO a VALUES(@a, :b)", { ":a": 1, ":b": 2 }),
      {
        name: "SQLite3Error",
        message: 'Unknown binding parameter: ":a"',
      }
    );
  });
});

describe("Insert values - types", function () {
  before(function () {
    this.db = open();
    this.db.exec("CREATE TABLE a (w BLOB, x INTEGER, y REAL, z TEXT)");
  });

  after(function () {
    this.db.close();
  });

  it("insert object", function () {
    assert.throws(
      () => this.db.run("INSERT INTO a (w) VALUES (?)", [{ a: 1 }]),
      {
        name: "SQLite3Error",
        message: 'Unsupported type for binding: "object"',
      }
    );
  });

  it("insert undefined", function () {
    assert.throws(
      () => this.db.run("INSERT INTO a (x) VALUES (?)", [undefined]),
      {
        name: "SQLite3Error",
        message: 'Unsupported type for binding: "undefined"',
      }
    );
  });

  it("insert null", function () {
    assert.strictEqual(
      this.db.run("INSERT INTO a (x) VALUES (?)", null).changes,
      1
    );
  });

  it("insert boolean", function () {
    assert.strictEqual(
      this.db.run("INSERT INTO a (x) VALUES (?)", true).changes,
      1
    );
    assert.strictEqual(
      this.db.run("INSERT INTO a (x) VALUES (?)", false).changes,
      1
    );
  });

  it("insert number", function () {
    assert.strictEqual(
      this.db.run("INSERT INTO a (x) VALUES (?)", 1).changes,
      1
    );
    assert.strictEqual(
      this.db.run("INSERT INTO a (x) VALUES (?)", 2147483648).changes,
      1
    );
    assert.strictEqual(
      this.db.run("INSERT INTO a (y) VALUES (?)", 1.2).changes,
      1
    );
  });

  it("insert bigint", function () {
    assert.strictEqual(
      this.db.run("INSERT INTO a (x) VALUES (?)", 1n).changes,
      1
    );
  });

  it("insert text", function () {
    assert.strictEqual(
      this.db.run("INSERT INTO a (z) VALUES (?)", "a").changes,
      1
    );
  });

  it("insert BLOB as single parameter", function () {
    assert.throws(
      () => this.db.run("INSERT INTO a (w) VALUES (?)", new Uint8Array(1)),
      {
        name: "SQLite3Error",
        message: 'Unknown binding parameter: "0"',
      }
    );
  });

  it("insert BLOB", function () {
    assert.strictEqual(
      this.db.run("INSERT INTO a (w) VALUES (?)", [new Uint8Array(1)]).changes,
      1
    );
  });
});

describe("Insert values - missing parameters", function () {
  before(function () {
    this.db = open();
    this.db.exec("CREATE TABLE a (x INTEGER)");
    this.db.exec("CREATE TABLE b (x INTEGER NOT NULL)");
  });

  after(function () {
    this.db.close();
  });

  it("insert with missing parameter", function () {
    assert.strictEqual(this.db.run("INSERT INTO a VALUES (?)").changes, 1);
  });

  it("insert with missing parameter NOT NULL", function () {
    assert.throws(() => this.db.run("INSERT INTO b (x) VALUES (?)"), {
      name: "SQLite3Error",
      message: "NOT NULL constraint failed: b.x",
    });
  });
});

describe("Query values", function () {
  before(function () {
    this.db = open();
    this.db.exec("CREATE TABLE a (x TEXT, y TEXT)");
    this.db.run("INSERT INTO a VALUES (?, ?)", ["x", "y"]);
    this.db.run("INSERT INTO a VALUES (?, ?)", ["a", "b"]);
    this.db.exec("CREATE TABLE b (x BLOB)");
    this.db.run("INSERT INTO b VALUES (?)", [new Uint8Array()]);
    this.db.run("INSERT INTO b VALUES (?)", [new Uint8Array([4, 5, 6])]);
  });

  after(function () {
    this.db.close();
  });

  it("query all", function () {
    assert.deepEqual(this.db.all("SELECT * from a"), [
      { x: "x", y: "y" },
      { x: "a", y: "b" },
    ]);
  });

  it("query expanded", function () {
    assert.deepEqual(
      this.db.get("SELECT * from a", undefined, { expand: true }),
      { a: { x: "x", y: "y" } }
    );
  });

  it("expression and expand -> $", function () {
    assert.deepEqual(
      this.db.get("SELECT sin(0)", undefined, { expand: true }),
      { $: { "sin(0)": 0 } }
    );
  });

  it("query BLOB", function () {
    assert.deepEqual(this.db.all("SELECT * from b"), [
      { x: new Uint8Array() },
      { x: new Uint8Array([4, 5, 6]) },
    ]);
  });
});

describe("Prepared statements", function () {
  before(function () {
    this.db = open();
  });

  after(function () {
    if (this.db.isOpen) this.db.close();
  });

  it("database property", function () {
    const stmt = this.db.prepare("SELECT 1");
    assert.strictEqual(stmt.database, this.db);
    stmt.finalize();
  });

  it("already finalized", function () {
    const stmt = this.db.prepare("SELECT 1");
    stmt.finalize();
    assert.throws(() => stmt.run(), {
      name: "SQLite3Error",
      message: "Statement already finalized",
    });
  });

  it("empty statement", function () {
    assert.throws(() => this.db.prepare(""), {
      name: "SQLite3Error",
      message: "Nothing to prepare",
    });
  });

  it("multiple calls to finalize()", function () {
    const stmt = this.db.prepare("SELECT 1");
    stmt.finalize();
    assert.throws(() => stmt.finalize(), {
      name: "SQLite3Error",
      message: "Statement already finalized",
    });
  });

  it("database already closed", function () {
    const stmt = this.db.prepare("SELECT 1");
    this.db.close();
    assert.throws(() => stmt.run(), {
      name: "SQLite3Error",
      message: "Database is closed",
    });
    stmt.finalize();
  });
});

describe("User-defined functions", function () {
  before(function () {
    this.db = open();
    this.db.function("identity", (x) => x);
    this.db.function("throwerror", () => {
      throw "Custom error";
    });
    this.db.function("undefinedreturn", () => undefined);
    // test redefinition of existing function
    this.db.function("undefinedreturn", () => undefined);
    this.db.function("boolreturn", (x) => (x == 1 ? true : false));
    this.db.function(
      "objectreturn",
      () => {
        return {
          a: 0,
        };
      },
      { deterministic: true }
    );
  });

  after(function () {
    this.db.close();
  });

  it("identity function - null", function () {
    assert.strictEqual(this.db.get("SELECT identity(?) AS r", null).r, null);
    assert.strictEqual(this.db.get("SELECT identity(NULL) AS r").r, null);
  });

  it("identity function - boolean", function () {
    assert.strictEqual(this.db.get("SELECT identity(?) AS r", true).r, 1);
    assert.strictEqual(this.db.get("SELECT identity(?) AS r", false).r, 0);
  });

  it("identity function - numbers", function () {
    assert.strictEqual(this.db.get("SELECT identity(1) AS r").r, 1);
    assert.strictEqual(this.db.get("SELECT identity(1.2) AS r").r, 1.2);
    assert.strictEqual(
      this.db.get("SELECT identity(?) AS r", Number.MAX_SAFE_INTEGER + 1).r,
      Number.MAX_SAFE_INTEGER + 1
    );
    assert.strictEqual(
      this.db.get("SELECT identity(10000000000) AS r").r,
      10000000000
    );
  });

  it("identity function - bigint", function () {
    assert.strictEqual(this.db.get("SELECT identity(?) AS r", 1n).r, 1);
    assert.strictEqual(
      this.db.get(
        "SELECT identity(?) AS r",
        BigInt(Number.MAX_SAFE_INTEGER) + 1n
      ).r,
      BigInt(Number.MAX_SAFE_INTEGER) + 1n
    );
    assert.strictEqual(
      this.db.get("SELECT identity(100000000000000000) AS r").r,
      100000000000000000n
    );
  });

  it("identity function - BLOB", function () {
    assert.deepEqual(
      this.db.get("SELECT identity(?) AS r", [new Uint8Array([1, 2, 3])]).r,
      new Uint8Array([1, 2, 3])
    );
    assert.deepEqual(
      this.db.get("SELECT identity(?) AS r", [new Uint8Array([])]).r,
      new Uint8Array([])
    );
  });

  it("identity function - text", function () {
    assert.strictEqual(this.db.get("SELECT identity(?) AS r", "a").r, "a");
  });

  it("return boolean", function () {
    assert.strictEqual(this.db.get("SELECT boolreturn(1) AS r").r, 1);
    assert.strictEqual(this.db.get("SELECT boolreturn(0) AS r").r, 0);
  });

  it("return object", function () {
    assert.throws(() => this.db.get("SELECT objectreturn()"), {
      name: "SQLite3Error",
      message: 'Unsupported type for function result: "object"',
    });
  });

  it("return undefined", function () {
    assert.throws(() => this.db.get("SELECT undefinedreturn()"), {
      name: "SQLite3Error",
      message: 'Unsupported type for function result: "undefined"',
    });
  });

  it("throw error", function () {
    assert.throws(() => this.db.get("SELECT throwerror()"), {
      name: "SQLite3Error",
      message: "Custom error",
    });
  });
});

describe("Transaction", function () {
  before(function () {
    this.db = open();
    this.db.exec("CREATE TABLE a (x INTEGER)");
  });

  after(function () {
    this.db.close();
  });

  it("inTransaction", function () {
    const stmt = this.db.prepare("INSERT INTO a VALUES (?)");
    assert.strictEqual(this.db.inTransaction, false);
    this.db.exec("BEGIN TRANSACTION");
    assert.strictEqual(this.db.inTransaction, true);
    stmt.run(1);
    this.db.exec("COMMIT");
    assert.strictEqual(this.db.inTransaction, false);
    stmt.finalize();
  });
});

describe("Low-level errors", function () {
  before(function () {
    this.db = open();
  });

  after(function () {
    this.db.close();
  });

  it("invalid bind", function () {
    const stmt = this.db.prepare("SELECT 1");
    assert.throws(() => stmt._bindValue(0, 1), {
      name: "SQLite3Error",
      message: "column index out of range",
    });
    stmt.finalize();
  });
});

describe("VFS", function () {
  before(function () {
    this.db = open();
    this.db.exec("CREATE TABLE a (x INTEGER)");
  });

  after(function () {
    this.db.close();
  });

  it("lock already exists", function () {
    fs.mkdirSync("test.db.lock");
    assert.throws(() => this.db.run("INSERT INTO a VALUES (?)", 1), {
      name: "SQLite3Error",
      message: "database is locked",
    });
    fs.rmSync("test.db.lock", { recursive: true, force: true });
  });
});
