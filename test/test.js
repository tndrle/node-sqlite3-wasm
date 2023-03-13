"use strict";

const { Database, SQLite3Error } = require("../dist/node-sqlite3-wasm.js");
const assert = require("node:assert/strict");
const fs = require("node:fs");

describe("version", function () {
  it("check version", function () {
    const content = fs.readFileSync("Makefile", "utf8");
    const v = content.match(/amalgamation-(\d+)\.zip/)[1];
    const major = v[0];
    const minor = parseInt(v.substring(1, 3));
    const patch = parseInt(v.substring(3, 5));
    const des_version = `${major}.${minor}.${patch}`

    const db = new Database();
    const act_version = db.get("SELECT sqlite_version() AS v").v;
    assert.strictEqual(act_version, des_version);
  });
});

describe("open database", function () {
  before(async function () {
    try {
      fs.unlinkSync("test.db");
    } catch {}
  });

  it("must exist", function () {
    assert.throws(() => {
      new Database("test.db", { fileMustExist: true });
    }, SQLite3Error);
  });
});

describe("general", function () {
  before(async function () {
    this.db = new Database("test.db");
    this.db.exec("CREATE TABLE a (x int, y string)");
  });

  after(function () {
    this.db.close();
    fs.unlinkSync("test.db");
  });

  it("run w/o parameters", function () {
    this.db.run("DELETE FROM a");
  });

  it("run return", function () {
    this.db.run("DELETE FROM a");
    const r = this.db.run("INSERT INTO a VALUES (?, ?)", [1, "a"]);
    assert.strictEqual(r.changes, 1);
    assert.strictEqual(r.lastInsertRowid, 1);
  });

  it("run w/ unnamed parameters", function () {
    let r = this.db.run("INSERT INTO a VALUES (?, ?)", [1, "a"]);
    assert.strictEqual(r.changes, 1);

    r = this.db.run("INSERT INTO a VALUES (?1, ?2)", [1, "a"]);
    assert.strictEqual(r.changes, 1);

    r = this.db.run("INSERT INTO a VALUES (?1, ?2)", [true, "a"]);
    assert.strictEqual(r.changes, 1);

    assert.throws(() => {
      this.db.run("INSERT INTO a VALUES (?0, ?2)", [1, "a"]);
    }, SQLite3Error);
  });

  it("run w/ named parameters", function () {
    let r = this.db.run("INSERT INTO a VALUES (:x, :y)", {
      ":x": 1,
      ":y": "a",
    });
    assert.strictEqual(r.changes, 1);

    r = this.db.run("INSERT INTO a VALUES (@x, @y)", { "@x": 1, "@y": "a" });
    assert.strictEqual(r.changes, 1);

    r = this.db.run("INSERT INTO a VALUES ($x, $y)", { $x: 1, $y: "a" });
    assert.strictEqual(r.changes, 1);

    r = this.db.run("INSERT INTO a VALUES (:x, $y)", { ":x": 1, $y: "a" });
    assert.strictEqual(r.changes, 1);

    assert.throws(() => {
      this.db.run("INSERT INTO a VALUES ($x, $y)", { $x: 1, $z: "a" });
    }, SQLite3Error);
  });

  it("insert object", function () {
    assert.throws(() => {
      this.db.run("INSERT INTO a VALUES (?, ?)", [{ a: 1 }, "a"]);
    }, SQLite3Error);
  });

  it("insert bigint", function () {
    const r = this.db.run("INSERT INTO a VALUES (?, ?)", [1n, "a"]);
    assert.strictEqual(r.changes, 1);
  });

  it("query all", function () {
    this.db.all("SELECT * from a");
  });

  it("query get", function () {
    this.db.get("SELECT * from a");
  });

  it("query expanded", function () {
    this.db.exec("DELETE FROM a");
    this.db.run("INSERT INTO a VALUES (?1, ?2)", [99, "x"]);
    const r = this.db.get("SELECT * from a", undefined, { expand: true });
    assert.deepEqual(r, { a: { x: 99, y: "x" } });
  });

  it("query with BigInt", function () {
    this.db.exec("DELETE FROM a");
    this.db.run("INSERT INTO a VALUES (?1, ?2)", [1000000000000000000, "x"]);
    const r = this.db.get("SELECT x from a");
    assert.deepEqual(r, { x: 1000000000000000000n });
  });

  it("get BLOB", function () {
    assert.throws(() => {
      this.db.get("SELECT randomblob(10)");
    }, SQLite3Error);
  });

  it("exec", function () {
    this.db.exec("DELETE FROM a");
    this.db.exec("SELECT sin(0)");
  });

  it("math function", function () {
    this.db.exec("SELECT sin(0)");
  });

  it("expression and expand -> $", function () {
    const r = this.db.get("SELECT sin(0)", undefined, { expand: true });
    assert.deepEqual(r, { $: { "sin(0)": 0 } });
  });

  it("inTransaction", function () {
    const stmt = this.db.prepare("INSERT INTO a VALUES (?1, ?2)");
    assert.strictEqual(this.db.inTransaction, false);
    this.db.exec("BEGIN TRANSACTION");
    assert.strictEqual(this.db.inTransaction, true);
    stmt.run([1, "a"]);
    this.db.exec("COMMIT");
    assert.strictEqual(this.db.inTransaction, false);
  });
});

describe("numbers", function () {
  before(async function () {
    this.db = new Database(":memory:");
    this.db.exec("CREATE TABLE a (x int, y real)");
  });

  after(function () {
    this.db.close();
  });

  it("test 1", function () {
    this.db.exec("DELETE FROM a");
    this.db.run("INSERT INTO a VALUES (?, ?)", [
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER + 1,
    ]);
    const r = this.db.get("SELECT * FROM a");
    assert.strictEqual(r.x, Number.MAX_SAFE_INTEGER);
    assert.strictEqual(r.y, Number.MAX_SAFE_INTEGER + 1);
    assert.strictEqual(typeof r.x, "number");
    assert.strictEqual(typeof r.y, "number");
  });

  it("test 2", function () {
    this.db.exec("DELETE FROM a");
    this.db.run("INSERT INTO a VALUES (?, ?)", [
      BigInt(Number.MAX_SAFE_INTEGER) + 10n,
      0,
    ]);
    const r = this.db.get("SELECT * FROM a");
    assert.strictEqual(r.x, BigInt(Number.MAX_SAFE_INTEGER) + 10n);
    assert.strictEqual(r.y, 0);
    assert.strictEqual(typeof r.x, "bigint");
    assert.strictEqual(typeof r.y, "number");
  });

  it("test 3", function () {
    this.db.exec("DELETE FROM a");
    this.db.run("INSERT INTO a VALUES (?, ?)", [
      1.5,
      BigInt(Number.MAX_SAFE_INTEGER),
    ]);
    const r = this.db.get("SELECT * FROM a");
    assert.strictEqual(r.x, 1.5);
    assert.strictEqual(r.y, Number.MAX_SAFE_INTEGER);
    assert.strictEqual(typeof r.x, "number");
    assert.strictEqual(typeof r.y, "number");
  });
});

describe("user-defined function", function () {
  before(async function () {
    this.db = new Database(":memory:");
    this.db.function("testadd", (a, b) => a + b);
    this.db.function("testadddet", (a, b) => a + b, { deterministic: true });
    this.db.function("testundefined", function () {});
    this.db.function("testbool", () => true);
    this.db.function("testlower", (a) => a?.toLowerCase() || null);
    this.db.function("testobject", () => {
      a: 1;
    });
    this.db.function("testsafeint", () => Number.MAX_SAFE_INTEGER);
    this.db.function("testbigint", () => 10000000000000000n);
  });

  after(function () {
    this.db.close();
  });

  it("add int", function () {
    const r = this.db.get("SELECT testadd(1, 2) as r").r;
    assert.strictEqual(r, 3);
  });

  it("deterministic function", function () {
    const r = this.db.get("SELECT testadddet(1, 2) as r").r;
    assert.strictEqual(r, 3);
  });

  it("add float", function () {
    const r = this.db.get("SELECT testadd(1.5, 2.2) as r").r;
    assert.strictEqual(r, 3.7);
  });

  it("undefined return", function () {
    assert.throws(() => {
      this.db.get("SELECT testundefined()");
    }, SQLite3Error);
  });

  it("bool", function () {
    const r = this.db.get("SELECT testbool() as r").r;
    assert.strictEqual(r, 1);
  });

  it("lower", function () {
    const r = this.db.get("SELECT testlower('HeLLo') as r").r;
    assert.strictEqual(r, "hello");
  });

  it("NULL argument and return", function () {
    const r = this.db.get("SELECT testlower(NULL) as r").r;
    assert.strictEqual(r, null);
  });

  it("object return", function () {
    assert.throws(() => {
      this.db.get("SELECT testobject()");
    }, SQLite3Error);
  });

  it("safe int return", function () {
    const r = this.db.get("SELECT testsafeint() as r").r;
    assert.strictEqual(r, Number.MAX_SAFE_INTEGER);
  });

  it("BigInt return", function () {
    const r = this.db.get("SELECT testbigint() as r").r;
    assert.strictEqual(r, 10000000000000000n);
  });

  it("BigInt argument", function () {
    const r = this.db.get(
      "SELECT testadd(10000000000000000, 10000000000000000) as r"
    ).r;
    assert.strictEqual(r, 20000000000000000n);
  });
});
