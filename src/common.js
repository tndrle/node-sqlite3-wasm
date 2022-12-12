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

"use strict";

const SQLITE_OK = 0;

class SQLite3Error extends Error {
  constructor(message) {
    super(message);
    this.name = "SQLite3Error";
  }
}

function _safeInt(bigInt) {
  if (bigInt >= Number.MIN_SAFE_INTEGER && bigInt <= Number.MAX_SAFE_INTEGER) {
    return Number(bigInt);
  } else {
    throw new SQLite3Error("Value too small or large for JavaScript integer");
  }
}

Module.SQLite3Error = SQLite3Error;
