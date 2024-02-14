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

// This VFS is loosely based on SQLite's test_demovfs.c

#include <string.h>
#include <sys/time.h>
#include <unistd.h>

#include "sqlite3.h"

typedef struct NodeJsFile NodeJsFile;
struct NodeJsFile {
  sqlite3_file base;  // Base class. Must be first.
  int fd;             // File descriptor
  int isLocked;
  const char *path;
};

extern int nodejsWrite(sqlite3_file *, const void *, int, sqlite_int64);
extern int nodejsClose(sqlite3_file *);
extern int nodejsRead(sqlite3_file *, void *, int, sqlite_int64);
extern int nodejsSync(sqlite3_file *, int);
extern int nodejsDelete(sqlite3_vfs *, const char *, int);
extern int nodejsFullPathname(sqlite3_vfs *, const char *, int, char *);
extern int nodejsAccess(sqlite3_vfs *, const char *, int, int *);
extern int nodejsRandomness(sqlite3_vfs *, int, char *);
extern int nodejsTruncate(sqlite3_file *, sqlite_int64);
extern int nodejsFileSize(sqlite3_file *, sqlite_int64 *);
extern int nodejsLock(sqlite3_file *, int);
extern int nodejsUnlock(sqlite3_file *, int);
extern int nodejsCheckReservedLock(sqlite3_file *, int *);

extern int nodejs_open(const char *, int, int);
extern int nodejs_max_path_length();

/*
** No xFileControl() verbs are implemented by this VFS.
*/
static int nodejsFileControl(sqlite3_file *pFile, int op, void *pArg) {
  return SQLITE_NOTFOUND;
}

/*
** The xSectorSize() and xDeviceCharacteristics() methods. These two
** may return special values allowing SQLite to optimize file-system
** access to some extent. But it is also safe to simply return 0.
*/
static int nodejsSectorSize(sqlite3_file *pFile) { return 0; }
static int nodejsDeviceCharacteristics(sqlite3_file *pFile) { return 0; }

static int nodejsOpen(
    sqlite3_vfs *pVfs,    // VFS
    const char *zName,    // File to open, or NULL for a temp file
    sqlite3_file *pFile,  // Pointer to NodeJsFile struct to populate
    int flags,            // Input SQLITE_OPEN_XXX flags
    int *pOutFlags        // Output SQLITE_OPEN_XXX flags (or NULL)
) {
  static const sqlite3_io_methods nodejsio = {
      1,                           // iVersion
      nodejsClose,                 // xClose
      nodejsRead,                  // xRead
      nodejsWrite,                 // xWrite
      nodejsTruncate,              // xTruncate
      nodejsSync,                  // xSync
      nodejsFileSize,              // xFileSize
      nodejsLock,                  // xLock
      nodejsUnlock,                // xUnlock
      nodejsCheckReservedLock,     // xCheckReservedLock
      nodejsFileControl,           // xFileControl
      nodejsSectorSize,            // xSectorSize
      nodejsDeviceCharacteristics  // xDeviceCharacteristics
  };

  NodeJsFile *p = (NodeJsFile *)pFile;
  memset(p, 0, sizeof(NodeJsFile));

  // Temp files not supported.
  if (zName == NULL) return SQLITE_IOERR;

  p->fd = nodejs_open(zName, flags, 0600);
  if (p->fd < 0) return SQLITE_CANTOPEN;
  if (pOutFlags) *pOutFlags = flags;
  p->base.pMethods = &nodejsio;
  p->path = zName;
  return SQLITE_OK;
}

/*
** This VFS does not support loading extensions
*/
static void *nodejsDlOpen(sqlite3_vfs *pVfs, const char *zPath) { return NULL; }
static void nodejsDlError(sqlite3_vfs *pVfs, int nByte, char *zErrMsg) {
  sqlite3_snprintf(nByte, zErrMsg, "Loadable extensions are not supported");
}
static void (*nodejsDlSym(sqlite3_vfs *pVfs, void *pH, const char *z))(void) {
  return 0;
}
static void nodejsDlClose(sqlite3_vfs *pVfs, void *pHandle) {}

static int nodejsSleep(sqlite3_vfs *pVfs, int nMicro) {
  if (nMicro >= 1000000) sleep(nMicro / 1000000);
  if (nMicro % 1000000) usleep(nMicro % 1000000);
  return nMicro;
}

static int nodejsCurrentTimeInt64(sqlite3_vfs *pVfs, sqlite3_int64 *piNow) {
  static const sqlite3_int64 unixEpoch = 24405875 * (sqlite3_int64)8640000;
  struct timeval sNow;
  gettimeofday(&sNow, 0);
  *piNow = unixEpoch + 1000 * (sqlite3_int64)sNow.tv_sec + sNow.tv_usec / 1000;
  return SQLITE_OK;
}

SQLITE_API int sqlite3_os_init(void) {
  static sqlite3_vfs nodejsvfs = {
      2,                      // iVersion
      sizeof(NodeJsFile),     // szOsFile
      -1,                     // mxPathname --- set below
      NULL,                   // pNext
      "nodejs",               // zName
      NULL,                   // pAppData
      nodejsOpen,             // xOpen
      nodejsDelete,           // xDelete
      nodejsAccess,           // xAccess
      nodejsFullPathname,     // xFullPathname
      nodejsDlOpen,           // xDlOpen
      nodejsDlError,          // xDlError
      nodejsDlSym,            // xDlSym
      nodejsDlClose,          // xDlClose
      nodejsRandomness,       // xRandomness
      nodejsSleep,            // xSleep
      NULL,                   // xCurrentTime
      NULL,                   // xGetLastError
      nodejsCurrentTimeInt64  // xCurrentTimeInt64
  };
  nodejsvfs.mxPathname = nodejs_max_path_length();
  sqlite3_vfs_register(&nodejsvfs, 1);
  return SQLITE_OK;
}

SQLITE_API int sqlite3_os_end(void) { return SQLITE_OK; }
