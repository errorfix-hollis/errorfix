---
error: "go: cannot find main module, but found .git/config"
error_full: |
  go: cannot find main module, but found .git/config in /home/me/project
  	to create a module there, run:
  	go mod init
  go: go.mod file not found in current directory or any parent directory; see 'go help modules'
cat: go
description: You ran a go command that needs a module (build, run, test, get, mod tidy) outside any directory with a go.mod file. Create one with go mod init, or run the command from the module's directory.
tldr: "In your project root run `go mod init github.com/you/project` (any module path works for local code), then `go mod tidy`. If go.mod already exists, `cd` into that directory (or a subdirectory) before running go commands. In a multi-module repo, use `go work init ./moduleA ./moduleB`. To install a tool, use `go install pkg@latest`."
keywords: go cannot find main module but found .git/config go.mod file not found in current directory or any parent directory go mod init go111module gopath go work go install
related: [go-imported-and-not-used, go-declared-and-not-used]
---
## What it means

Since Go 1.16, module mode is the default (`GO111MODULE=on`). Commands like `go build`, `go run`, `go test` and `go mod tidy` look for `go.mod` in the current directory and then each parent. If none is found, there's no "main module" to work in and you get one of these messages. The `.git/config` hint just tells you where your repo root is, suggesting that's where `go.mod` should go.

## Fix 1: create go.mod for a new project

From the project's root directory:

```bash
go mod init github.com/yourname/myproject
go mod tidy
```

The module path is the import prefix for your packages. If you'll never publish it, a simple name like `myproject` also works (for publishing, it should match the repository URL).

After that, packages inside import each other with the module path:

```go
import "github.com/yourname/myproject/internal/store"
```

## Fix 2: you're in the wrong directory

If go.mod exists, you're probably above it (e.g. in a repo where the module lives in `backend/`):

```bash
find . -name go.mod -not -path "*/vendor/*"
cd backend
go build ./...
```

In VS Code, gopls has the same requirement: open the folder that contains go.mod, or use a workspace (Fix 3).

## Fix 3: multiple modules in one repo — go.work

For a repo containing several modules, create a workspace at the root (Go 1.18+):

```bash
go work init ./api ./worker ./shared
```

Then `go build ./api/...` and gopls work from the root, and local changes to `shared` are picked up without `replace` directives.

## Fix 4: installing a tool, not building a project

`go get` no longer installs binaries outside a module. Use `go install` with a version:

```bash
go install golang.org/x/tools/gopls@latest
go install github.com/air-verse/air@latest
```

Binaries go to `$(go env GOPATH)/bin` — add it to `PATH`:

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
```

## Fix 5: running a single file

`go run main.go` works without go.mod only if the file imports nothing but the standard library. Once it imports a third-party package, you need a module: `go mod init`, then `go mod tidy` to fetch dependencies.

## Old GOPATH projects

Legacy code under `$GOPATH/src` without go.mod can be built temporarily with:

```bash
GO111MODULE=off go build
```

This mode is deprecated; migrating is just `go mod init <import path>` plus `go mod tidy` in the project root.

## Check your environment

If go.mod exists and you still get the error, check that `GO111MODULE` or `GOFLAGS` aren't set to something odd, and where Go thinks the module file is:

```bash
go env GO111MODULE GOMOD GOFLAGS
```

`GOMOD` prints the path of the go.mod in use — empty or `/dev/null` means none was found.
