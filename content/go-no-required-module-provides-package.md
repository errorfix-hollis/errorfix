---
error: "no required module provides package"
error_full: |
  main.go:6:2: no required module provides package github.com/gorilla/mux; to add it:
  	go get github.com/gorilla/mux
  package example.com/app/internal/db is not in std (/usr/local/go/src/example.com/app/internal/db)
cat: go
description: "The import path isn't provided by any module in your go.mod. Either the dependency hasn't been added, the import path is misspelled, or a local package path doesn't match your module name."
tldr: "Add the dependency: `go get github.com/gorilla/mux` (or run `go mod tidy` to add all missing imports). For your own packages, the import must start with the `module` path from go.mod (e.g. `example.com/app/internal/db`). Make sure you run commands inside the module directory, and with `GO111MODULE` not set to `off`."
keywords: go golang no required module provides package to add it go get go mod tidy go.mod module path local package import is not in std go111module go work workspace
related: [go-cannot-find-main-module, go-missing-go-sum-entry, go-undefined]
---
## What it means

In module mode, every import must come from the standard library, your own module, or a module listed in `go.mod` (`require`). If no listed module contains the package, the go command stops with this error and helpfully suggests `go get`.

Show the module you are in:

```bash
go env GOMOD          # path to go.mod, or /dev/null if not in a module
head -3 go.mod        # module example.com/app
```

## Cause 1: third-party dependency not added yet

```bash
go get github.com/gorilla/mux@latest
# or add every missing import at once:
go mod tidy
```

Commit both `go.mod` and `go.sum`. If you get `missing go.sum entry` afterwards, see [missing go.sum entry](/go/go-missing-go-sum-entry/).

## Cause 2: the module path vs the package path

`go get` must find a module that *contains* the package. For major versions 2+, the import path includes the version suffix:

```go
import "github.com/redis/go-redis/v9"      // correct for v9
import "github.com/jackc/pgx/v5/pgxpool"
```

Importing `github.com/jackc/pgx/pgxpool` (no `/v5`) looks for a package that only exists in v1-v4. Check the module's `go.mod` on pkg.go.dev for the exact path. Moved/renamed repos (e.g. `github.com/go-redis/redis` → `github.com/redis/go-redis/v9`) also cause this.

## Cause 3: your own package with the wrong import path

Imports of local packages are relative to the `module` line, not the filesystem or GOPATH:

```
go.mod             -> module example.com/app
internal/db/db.go  -> package db
main.go            -> import "example.com/app/internal/db"
```

`import "app/internal/db"` or `import "./internal/db"` fails. If the error says `package app/internal/db is not in std`, the first path element doesn't match your module name. Fix the import, or change the module line (and all imports) consistently.

## Cause 4: not inside the module

Running `go run` / `go build` from a parent directory, or on a single file outside the module, gives this error for every dependency. `cd` into the folder with go.mod. For several modules in one repo, use a workspace:

```bash
go work init ./api ./shared
```

Then imports of `example.com/shared` from `api` resolve locally. To use a local copy of a dependency without a workspace:

```bash
go mod edit -replace example.com/shared=../shared
go mod tidy
```

## Cause 5: build tags, vendoring, GOFLAGS

- With a `vendor/` directory, Go uses `-mod=vendor` by default. After adding a dependency, run `go mod vendor`.
- `GOFLAGS=-mod=mod` or `-mod=readonly` in CI changes whether `go.mod` can be updated; in readonly mode you must commit the updated go.mod.
- `GO111MODULE=off` forces the old GOPATH mode: `go env -u GO111MODULE`.

## Cause 6: private modules

For private repositories `go get` fails to download, then reports the package as missing. Tell Go to skip the public proxy and checksum DB:

```bash
go env -w GOPRIVATE=github.com/myorg/*
git config --global url."git@github.com:".insteadOf "https://github.com/"
go get github.com/myorg/lib
```
