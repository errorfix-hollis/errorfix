---
error: "go: updates to go.mod needed; to update it: go mod tidy"
error_full: |
  go: updates to go.mod needed; to update it:
  	go mod tidy
  go: inconsistent vendoring in /src/app:
  	github.com/pkg/errors@v0.9.1: is explicitly required in go.mod, but not marked as explicit in vendor/modules.txt
cat: go
description: "Since Go 1.16, build commands no longer edit go.mod automatically. The module's go.mod (or vendor/modules.txt) is out of date with the imports or the requirements, so the go command refuses to build until you update it."
tldr: "Run `go mod tidy` and commit both `go.mod` and `go.sum`. If you vendor dependencies, follow it with `go mod vendor`. In CI, run `go mod tidy` locally first; don't use `-mod=mod` to hide the drift."
keywords: go updates to go.mod needed go mod tidy inconsistent vendoring go.sum -mod=mod readonly go 1.16 go build go test ci go.mod out of date
related: [go-missing-go-sum-entry, go-no-required-module-provides-package, go-cannot-find-main-module]
---
## What it means

Go 1.16 made `-mod=readonly` the default for `go build`, `go test`, `go run` and friends. These commands check that `go.mod` already describes everything the build needs, and if the go command *would* have to add, remove or upgrade a requirement, it stops and tells you instead of silently editing the file.

Typical triggers:

- You imported a new package, or removed the last import of one.
- You edited `go.mod` by hand (changed a version, removed a line, added a `replace`).
- A merge or rebase combined two different `go.mod` files.
- The `go` directive or toolchain changed (e.g. a dependency needs a newer `go` version, Go 1.21+).
- `vendor/modules.txt` no longer matches `go.mod`.

## Fix 1: tidy and commit

```bash
go mod tidy
git add go.mod go.sum
git commit -m "go mod tidy"
```

`go mod tidy` adds missing requirements, removes unused ones, updates `// indirect` markers and fills `go.sum`. Run it with the same Go version your CI uses, because tidy output can differ between Go releases.

If tidy fails because a module can't be downloaded, see [no required module provides package](/go/go-no-required-module-provides-package/) and check `GOPROXY`/`GOPRIVATE` for private repos:

```bash
go env GOPROXY GOPRIVATE
go env -w GOPRIVATE=github.com/your-org/*
```

## Fix 2: inconsistent vendoring

If the project has a `vendor/` directory, Go builds with `-mod=vendor` automatically (when the `go` directive is 1.14+), and `vendor/modules.txt` must match `go.mod` exactly:

```bash
go mod tidy
go mod vendor
git add go.mod go.sum vendor
```

If you don't actually want vendoring, delete `vendor/` and the go command will use the module cache.

## Fix 3: Docker builds and CI

A common Dockerfile mistake is copying `go.mod`/`go.sum`, running `go mod download`, then copying source that imports packages not in `go.mod`. Docker isn't the problem; the repo is out of date. Run `go mod tidy` locally and commit.

Add a check to CI so drift is caught early:

```bash
go mod tidy
git diff --exit-code go.mod go.sum
```

## Fix 4: the `go` / `toolchain` line

Since Go 1.21, `go.mod` `go 1.22` is a minimum requirement. If a dependency needs a newer Go than your `go` line, tidy will bump it. If your local Go is older, the go command may try to download a newer toolchain (`GOTOOLCHAIN=auto`). Upgrade Go, or pin dependency versions that support your Go version:

```bash
go version
go get example.com/lib@v1.4.0   # an older version compatible with your Go
go mod tidy
```

## About `-mod=mod`

`go build -mod=mod` lets the build edit `go.mod` like pre-1.16 Go did. It makes the error disappear but leaves an uncommitted change, so the next clean checkout fails again. Use it for experiments only, and commit the result of `go mod tidy` instead.
