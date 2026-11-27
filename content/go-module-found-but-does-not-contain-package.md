---
error: "module found, but does not contain package"
error_full: |
  go: finding module for package github.com/example/lib/v2/client
  main.go:5:2: module github.com/example/lib@latest found (v1.8.0), but does not contain package github.com/example/lib/v2/client
cat: go
description: "Go found the module you asked for, but the import path doesn't match any package directory in the version it resolved. Usually a missing /vN major-version suffix, a package that was moved or removed, or a typo in the import path."
tldr: "Check the import path against the module's go.mod and folder layout. For v2+ modules include the suffix in both places: `import \"github.com/example/lib/v2/client\"` and `go get github.com/example/lib/v2@latest`. If the package moved, update the import; if it exists only in a newer/older tag, `go get module@version` that has it, then `go mod tidy`."
keywords: go module found but does not contain package go get go mod tidy major version suffix v2 import path go.mod module path replace subdirectory package moved
related: [go-no-required-module-provides-package, go-missing-go-sum-entry, go-cannot-find-main-module]
---
## What it means

An import path is `<module path>/<subdirectory>`. Go looks for the longest module path that matches your import, downloads that module (at `@latest` if it's not in `go.mod`), and then looks for the subdirectory. The module exists, but that folder with `.go` files doesn't exist in that version.

The error names the version Go picked — `@latest found (v1.8.0)` — which is the key clue. Inspect it:

```bash
go list -m -versions github.com/example/lib
go mod download -json github.com/example/lib@v1.8.0   # shows the local Dir
ls "$(go env GOMODCACHE)/github.com/example/lib@v1.8.0"
```

## Cause 1: missing or wrong major version suffix

Since modules v2+, the major version is part of the module path (`module github.com/example/lib/v2` in its `go.mod`). Without the suffix, Go resolves the latest **v0/v1** release, which may not have the package:

```go
import "github.com/go-chi/chi/middleware"     // resolves v1.x
import "github.com/go-chi/chi/v5/middleware"  // v5
```

```bash
go get github.com/go-chi/chi/v5@latest
go mod tidy
```

The reverse also happens: an import with `/v2` for a module that never published a v2 module path. Check the `module` line of the repo's `go.mod` on the tag you want.

## Cause 2: the package moved, was renamed or removed

Libraries reorganize: packages move under `pkg/`, `internal/`, or into separate modules. Look at the repository for that version tag, or the docs on pkg.go.dev, and update the import. Packages under `internal/` can't be imported from another module at all.

## Cause 3: the package lives in a separate (nested) module

Some repos contain multiple modules, e.g. `github.com/aws/aws-sdk-go-v2/service/s3` has its own `go.mod`. The root module doesn't contain that package; get the nested module explicitly:

```bash
go get github.com/aws/aws-sdk-go-v2/service/s3
```

## Cause 4: the version you pinned doesn't have it yet

The package was added after the version in your `go.mod`, or only exists on a branch:

```bash
go get github.com/example/lib@v1.9.0
go get github.com/example/lib@main        # pseudo-version from a branch
```

## Cause 5: your own module path doesn't match the import

Importing your own packages with a path that doesn't start with the `module` line in your `go.mod` makes Go fetch your repo from the network (often an old pushed version):

```
// go.mod
module github.com/me/app

// main.go
import "github.com/me/app/internal/db"   // must use exactly this prefix
```

After renaming the module or repo, update the `module` line and all imports. While developing two local modules together, use a `replace` directive or a workspace:

```bash
go mod edit -replace github.com/me/lib=../lib
# or
go work init . ../lib
```

## Cause 6: a stale proxy or cache

A freshly pushed tag may not be visible through `proxy.golang.org` yet. For private repos set `GOPRIVATE`:

```bash
go env -w GOPRIVATE=github.com/mycompany/*
GOPROXY=direct go get github.com/example/lib@v1.9.0
```
