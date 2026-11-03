---
error: "missing go.sum entry for module providing package"
error_full: |
  main.go:6:2: missing go.sum entry for module providing package github.com/gin-gonic/gin (imported by example.com/app); to add:
  	go get example.com/app
cat: go
description: go.mod lists (or your code imports) a module whose checksum isn't recorded in go.sum, and since Go 1.16 the go command won't add it automatically during build. Run go mod tidy.
tldr: "Run `go mod tidy` in the module root (the folder with go.mod) to add missing requirements and go.sum lines, then commit both go.mod and go.sum. For a single package: `go get github.com/gin-gonic/gin`. In Docker, copy go.sum along with go.mod before `go mod download`."
keywords: go missing go.sum entry for module providing package go mod tidy go get go.sum checksum go 1.16 docker build golang
related: [go-cannot-find-main-module, go-imported-and-not-used, go-undefined]
---
## What it means

`go.sum` stores cryptographic hashes of every module version your build depends on. Since Go 1.16, commands like `go build`, `go run` and `go test` run in `-mod=readonly` mode: they refuse to modify `go.mod` or `go.sum`. If a needed hash is missing, they stop and tell you to add it.

## Fix 1: go mod tidy

From the directory containing `go.mod`:

```bash
go mod tidy
go build ./...
```

`tidy` adds requirements for every package imported by your code (including tests), removes unused ones, and writes all needed `go.sum` lines. Commit both files:

```bash
git add go.mod go.sum
git commit -m "go mod tidy"
```

## Fix 2: go get a specific package

If you just added an import:

```bash
go get github.com/gin-gonic/gin
```

This adds it to `go.mod` and its sums to `go.sum`. Running `go mod tidy` afterwards is still a good idea.

## Cause: go.sum not committed or not copied

**In git:** `go.sum` is listed in `.gitignore` or was never committed. It should be committed — remove it from `.gitignore`.

**In Docker:** the classic layer-caching pattern must copy both files:

```dockerfile
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/app
```

If you only `COPY go.mod ./`, the build fails with this error. Also make sure `.dockerignore` doesn't exclude `go.sum`.

## Cause: wrong directory or nested modules

If your repo has several `go.mod` files (e.g. `./go.mod` and `./tools/go.mod`), run `tidy` in the module that does the import. Check which module you're in:

```bash
go env GOMOD
```

With Go workspaces (`go.work`), run `go work sync` and then `go mod tidy` in each module.

## Cause: a replace directive or edited go.mod

Manually editing `go.mod` (bumping a version, adding `replace`) doesn't update `go.sum`. Run `go mod tidy` after any manual edit.

## Cause: private modules

If `tidy` fails for a private repo with `verifying module: ... 410 Gone` or `checksum database` errors, tell Go not to use the public proxy and sum database for it:

```bash
go env -w GOPRIVATE=github.com/myorg/*
```

and configure git authentication (e.g. `git config --global url."git@github.com:".insteadOf "https://github.com/"`).

## Don't

- Don't delete `go.sum` to "fix" checksum errors — `tidy` will regenerate it, but you lose verification of previously recorded versions.
- Don't use `-mod=mod` in CI to paper over it; fix the committed files instead. A CI check like `go mod tidy && git diff --exit-code go.mod go.sum` catches this early.
