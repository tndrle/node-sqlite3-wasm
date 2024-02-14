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

/* c8 ignore stop */

"use strict";

const path = require("node:path");
const crypto = require("node:crypto");

const SQLITE_CANTOPEN = 14;
const SQLITE_IOERR_READ = 266;
const SQLITE_IOERR_SHORT_READ = 522;
const SQLITE_IOERR_FSYNC = 1034;
const SQLITE_IOERR_WRITE = 778;
const SQLITE_IOERR_DELETE = 2570;
const SQLITE_IOERR_CLOSE = 4106;
const SQLITE_IOERR_TRUNCATE = 1546;
const SQLITE_IOERR_FSTAT = 1802;
const SQLITE_IOERR_LOCK = 3850;
const SQLITE_IOERR_UNLOCK = 2058;

const SQLITE_OPEN_READONLY = 1;
const SQLITE_OPEN_READWRITE = 2;
const SQLITE_OPEN_CREATE = 4;
const SQLITE_OPEN_EXCLUSIVE = 16;

const SQLITE_ACCESS_READWRITE = 1;
const SQLITE_ACCESS_READ = 2;

const SQLITE_LOCK_NONE = 0;
const SQLITE_BUSY = 5;

function _fd(fileInfo) {
  // fileInfo: pointer to struct NodeJsFile in file vfs.c
  return getValue(fileInfo + 4, "i32"); // read NodeJsFile.fd
}

function _isLocked(fileInfo) {
  return getValue(fileInfo + 8, "i32") != 0; // read NodeJsFile.isLocked
}

function _setLocked(fileInfo, locked) {
  setValue(fileInfo + 8, locked ? 1 : 0, "i32"); // write NodeJsFile.isLocked
}

function _path(fileInfo) {
  return UTF8ToString(getValue(fileInfo + 12, "i32")); // read NodeJsFile.path
}

function _safeInt(bigInt) {
  if (bigInt < Number.MIN_SAFE_INTEGER || bigInt > Number.MAX_SAFE_INTEGER)
    throw 0;
  return Number(bigInt);
}

/* c8 ignore start */
