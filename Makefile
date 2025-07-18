SHELL := /bin/bash

SQLITE_URL = https://www.sqlite.org/2025/sqlite-amalgamation-3500300.zip
SQLITE_HASH = a49fef837c51bc3375df30c0b0ec148800dce12503289ab94776cc01a675e945
SQLITE_SRC_FILES = sqlite-src/sqlite3.c sqlite-src/sqlite3.h

JS_PRE_FILES = src/api.js src/vfs-pre.js
JS_LIB_FILES = src/vfs.js
OBJECT_FILES = build/sqlite3.o build/vfs.o
EXPORTED_FUNCS_JSON = build/exp_funcs.json

SQLITE_FLAGS = \
	-DSQLITE_OMIT_DEPRECATED \
	-DSQLITE_OMIT_LOAD_EXTENSION \
	-DSQLITE_OMIT_UTF16 \
	-DSQLITE_OMIT_GET_TABLE \
	-DSQLITE_OMIT_PROGRESS_CALLBACK \
	-DSQLITE_OMIT_SHARED_CACHE \
	-DSQLITE_OMIT_TCL_VARIABLE \
	-DSQLITE_OMIT_DESERIALIZE \
	-DSQLITE_DISABLE_LFS \
	-DSQLITE_ENABLE_COLUMN_METADATA \
	-DSQLITE_ENABLE_MATH_FUNCTIONS \
	-DSQLITE_ENABLE_STAT4 \
	-DSQLITE_ENABLE_UPDATE_DELETE_LIMIT \
	-DSQLITE_DEFAULT_FOREIGN_KEYS=1 \
	-DSQLITE_DEFAULT_MEMSTATUS=0 \
	-DSQLITE_DQS=0 \
	-DSQLITE_TEMP_STORE=3 \
	-DSQLITE_OS_OTHER=1 \
	-DSQLITE_ENABLE_FTS5 \
	-DSQLITE_ENABLE_DBSTAT_VTAB

EM_FLAGS = -O3 -flto

LINK_FLAGS = \
	-s EXPORTED_FUNCTIONS=@$(EXPORTED_FUNCS_JSON) \
	-s EXPORTED_RUNTIME_METHODS=cwrap,addFunction,removeFunction \
	-s NODEJS_CATCH_EXIT=0 \
	-s NODEJS_CATCH_REJECTION=0 \
	-s MODULARIZE=1 \
	-s ALLOW_TABLE_GROWTH=1 \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s ENVIRONMENT=node \
	-s FILESYSTEM=0 \
	-s WASM_BIGINT \
	-s WASM_ASYNC_COMPILATION=0

all: dist/node-sqlite3-wasm.js

.PHONY: coverage
coverage: EM_FLAGS = -O1
coverage: dist/node-sqlite3-wasm.js
	head -1 $< | grep -q c8 || sed -i '1 i\/* c8 ignore start */' $<

dist/node-sqlite3-wasm.js: $(OBJECT_FILES) $(EXPORTED_FUNCS_JSON) $(JS_PRE_FILES) $(JS_LIB_FILES)
	mkdir -p dist
	emcc $(LINK_FLAGS) $(EM_FLAGS) $(OBJECT_FILES) --js-library $(JS_LIB_FILES) \
		$(foreach f,$(JS_PRE_FILES),--pre-js $(f)) -o $@
	sed -i -E 's/^\}\)\(\);$$/})()();/' $@  # resolve factory

build/sqlite3.o: $(SQLITE_SRC_FILES)
	mkdir -p build
	emcc $(EM_FLAGS) $(SQLITE_FLAGS) -c $< -o $@

build/vfs.o: src/vfs.c sqlite-src/sqlite3.h
	mkdir -p build
	emcc $(EM_FLAGS) $(SQLITE_FLAGS) -I sqlite-src -c $< -o $@

$(EXPORTED_FUNCS_JSON): src/api.js
	mkdir -p build
	echo '[' > $@
	perl -p0e 's/.*signatures = \{\n(.+?)\s*\}.*/\1/smg' src/api.js | \
		perl -pe 's/\s*(.+):.*/"_sqlite3_\1"/' | \
		paste -sd "," - >> $@
	echo ',"_malloc","_free"]' >> $@

.PHONY: download
download: $(SQLITE_SRC_FILES)

SQLITE_ZIP = sqlite-src/sqlite.zip

$(SQLITE_SRC_FILES):
	mkdir -p sqlite-src
	curl -LsSf '$(SQLITE_URL)' -o $(SQLITE_ZIP)
	[ $(SQLITE_HASH) == $$(openssl dgst -sha3-256 $(SQLITE_ZIP) | awk '{print $$NF}') ]
	unzip -ojDD $(SQLITE_ZIP) "*/sqlite3.c" "*/sqlite3.h" -d sqlite-src/
	rm $(SQLITE_ZIP)
