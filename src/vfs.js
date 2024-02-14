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

"use strict";

addToLibrary({
  nodejsAccess: function (vfs, filePath, flags, outResult) {
    /* c8 ignore stop */
    let aflags = fs.constants.F_OK;
    if (flags == SQLITE_ACCESS_READWRITE)
      aflags = fs.constants.R_OK | fs.constants.W_OK;
    if (flags == SQLITE_ACCESS_READ) aflags = fs.constants.R_OK;
    try {
      fs.accessSync(UTF8ToString(filePath), aflags);
      setValue(outResult, 1, "i32");
    } catch {
      setValue(outResult, 0, "i32");
    }
    return SQLITE_OK;
  },
  nodejsFullPathname: function (vfs, relPath, sizeFullPath, outFullPath) {
    const full = path.resolve(UTF8ToString(relPath));
    stringToUTF8(full, outFullPath, sizeFullPath);
    return full.length < sizeFullPath ? SQLITE_OK : SQLITE_CANTOPEN;
  },
  nodejsWrite: function (fi, buffer, bytes, offset) {
    try {
      const bytesWritten = fs.writeSync(
        _fd(fi),
        HEAPU8.subarray(buffer, buffer + bytes),
        0,
        bytes,
        _safeInt(offset)
      );
      return bytesWritten != bytes ? SQLITE_IOERR_WRITE : SQLITE_OK;
    } catch {
      return SQLITE_IOERR_WRITE;
    }
  },
  nodejsSync: function (fi, flags) {
    try {
      fs.fsyncSync(_fd(fi));
    } catch {
      return SQLITE_IOERR_FSYNC;
    }
    return SQLITE_OK;
  },
  nodejsClose: function (fi) {
    _nodejsUnlock(fi, SQLITE_LOCK_NONE);
    try {
      fs.closeSync(_fd(fi));
    } catch {
      return SQLITE_IOERR_CLOSE;
    }
    return SQLITE_OK;
  },
  nodejsRead: function (fi, outBuffer, bytes, offset) {
    const buf = HEAPU8.subarray(outBuffer, outBuffer + bytes);
    let bytesRead;
    try {
      bytesRead = fs.readSync(_fd(fi), buf, 0, bytes, offset);
    } catch {
      return SQLITE_IOERR_READ;
    }
    if (bytesRead == bytes) {
      return SQLITE_OK;
    } else if (bytesRead >= 0) {
      if (bytesRead < bytes) {
        try {
          buf.fill(0, bytesRead);
        } catch {
          return SQLITE_IOERR_READ;
        }
      }
      return SQLITE_IOERR_SHORT_READ;
    }
    return SQLITE_IOERR_READ;
  },
  nodejsDelete: function (vfs, filePath, dirSync) {
    const pathStr = UTF8ToString(filePath);
    try {
      fs.unlinkSync(pathStr);
    } catch (err) {
      if (err.code != "ENOENT") return SQLITE_IOERR_DELETE;
    }
    if (dirSync) {
      let fd = -1;
      try {
        fd = fs.openSync(path.dirname(pathStr), "r");
        fs.fsyncSync(fd);
      } catch {
        return SQLITE_IOERR_FSYNC;
      } finally {
        try {
          fs.closeSync(fd);
        } catch {
          return SQLITE_IOERR_FSYNC;
        }
      }
    }
    return SQLITE_OK;
  },
  nodejsRandomness: function (vfs, bytes, outBuffer) {
    const buf = HEAPU8.subarray(outBuffer, outBuffer + bytes);
    crypto.randomFillSync(buf);
    return bytes;
  },
  nodejsTruncate: function (fi, size) {
    try {
      fs.ftruncateSync(_fd(fi), _safeInt(size));
    } catch {
      return SQLITE_IOERR_TRUNCATE;
    }
    return SQLITE_OK;
  },
  nodejsFileSize: function (fi, outSize) {
    try {
      setValue(outSize, fs.fstatSync(_fd(fi)).size, "i64");
    } catch {
      return SQLITE_IOERR_FSTAT;
    }
    return SQLITE_OK;
  },
  nodejsLock: function (fi, level) {
    // level is never SQLITE_LOCK_NONE
    if (!_isLocked(fi)) {
      try {
        fs.mkdirSync(`${_path(fi)}.lock`);
      } catch (err) {
        return err.code == "EEXIST" ? SQLITE_BUSY : SQLITE_IOERR_LOCK;
      }
      _setLocked(fi, true);
    }
    return SQLITE_OK;
  },
  nodejsUnlock: function (fi, level) {
    // level is either SQLITE_LOCK_NONE or SQLITE_LOCK_SHARED
    if (level == SQLITE_LOCK_NONE && _isLocked(fi)) {
      try {
        fs.rmdirSync(`${_path(fi)}.lock`);
      } catch (err) {
        if (err.code != "ENOENT") return SQLITE_IOERR_UNLOCK;
      }
      _setLocked(fi, false);
    }
    return SQLITE_OK;
  },
  nodejsCheckReservedLock: function (fi, outResult) {
    try {
      fs.accessSync(`${_path(fi)}.lock`, fs.constants.F_OK);
      setValue(outResult, 1, "i32");
    } catch {
      setValue(outResult, 0, "i32");
    }
    return SQLITE_OK;
  },
  nodejs_max_path_length: function () {
    return process.platform == "win32" ? 260 : 4096;
  },
  nodejs_open: function (filePath, flags, mode) {
    let oflags = 0;
    if (flags & SQLITE_OPEN_EXCLUSIVE) oflags |= fs.constants.O_EXCL;
    if (flags & SQLITE_OPEN_CREATE) oflags |= fs.constants.O_CREAT;
    if (flags & SQLITE_OPEN_READONLY) oflags |= fs.constants.O_RDONLY;
    if (flags & SQLITE_OPEN_READWRITE) oflags |= fs.constants.O_RDWR;

    try {
      return fs.openSync(UTF8ToString(filePath), oflags, mode);
    } catch {
      return -1;
    }
    /* c8 ignore start */
  },
});
