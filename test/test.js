"use strict";

import loadSQLite from "../dist/node-sqlite3-wasm.js";
import assert from "assert/strict"
import fs from "fs";

const sql = await loadSQLite();
const Database = sql.Database;
const SQLite3Error = sql.SQLite3Error;

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
    assert.throws(() => {
      this.db.run("INSERT INTO a VALUES (?, ?)", [1n, "a"]);
    }, SQLite3Error);
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
});
