---
error: "undefined: X"
error_full: |
  ./main.go:8:2: undefined: helper
  # command-line-arguments
  ./main.go:12:9: undefined: Config
cat: go
description: The Go compiler cannot find a name you used. Usually the file that defines it is not being compiled, the name is unexported from another package, or there is a typo or build-tag mismatch.
tldr: "Build the whole package, not one file: `go run .` instead of `go run main.go`. For names from another package, capitalise them (`Helper`, not `helper`) and qualify them (`utils.Helper`). Check for typos, `//go:build` tags and `_test.go`-only definitions."
keywords: go golang undefined compile error go run main.go multiple files unexported identifier package build tags undefined function undefined type
related: [go-declared-and-not-used, go-imported-and-not-used, go-cannot-find-main-module]
---
## What it means

Go resolves every identifier at compile time. `undefined: helper` means that, in the set of files being compiled for this package, nothing declares `helper` in scope at that point. The code may well exist on disk; the compiler just isn't seeing it.

## Fix 1: you ran a single file (`go run main.go`)

The most common cause. If `helper` is declared in `util.go` in the same folder, this fails:

```bash
go run main.go        # only compiles main.go -> undefined: helper
```

Compile the whole package instead:

```bash
go run .              # all .go files in the current directory
go build ./...        # every package in the module
```

The same applies to `go test file_test.go` — use `go test ./...` or `go test .`.

## Fix 2: unexported name from another package

Only identifiers that start with an **uppercase letter** are visible outside their package.

```go
// package utils
func helper() {}   // unexported
func Helper() {}   // exported
```

```go
import "example.com/myapp/utils"

utils.Helper()     // OK
utils.helper()     // error (undefined / not exported)
helper()           // error: must be qualified with the package name
```

Rename the declaration to start with a capital letter, and always call it as `pkg.Name`.

## Fix 3: build tags or OS-specific files

Files can be excluded from a build:

- A `//go:build linux` (or old `// +build`) line at the top.
- File name suffixes such as `_windows.go`, `_linux.go`, `_arm64.go`.
- `_test.go` files are only compiled by `go test`.

If the definition lives only in one of these, it is undefined on other platforms or in normal builds. Check which files are included:

```bash
go list -f '{{.GoFiles}} {{.IgnoredGoFiles}}' .
```

Provide an implementation for every target (e.g. `foo_linux.go` and `foo_other.go` with `//go:build !linux`), or move shared code to an untagged file.

## Fix 4: different package names in one folder

All non-test files in a directory must have the same `package` clause. If `util.go` says `package util` while `main.go` says `package main`, you get an error like `found packages main (main.go) and util (util.go)`, or the names are undefined. Make them match, or move the file into its own directory and import it.

## Fix 5: scope, typos and generated code

- Variables declared inside `if`, `for` or `{}` blocks are not visible outside them:

```go
if ok {
    x := 1
}
fmt.Println(x) // undefined: x
```

Declare `x` before the block (`var x int`) and assign inside it.

- Go is case-sensitive: `config` and `Config` are different names.
- Code from `go generate`, protobuf or mocks must actually be generated: run `go generate ./...` / `protoc` first.
- Calling a newer standard library function (e.g. `slices.Contains`, `min`/`max` builtins in Go 1.21) with an older toolchain or an older `go` line in `go.mod` also gives `undefined`. Check `go version` and the `go` directive in `go.mod`.

## Fix 6: stale editor/module state

If `go build ./...` works but your editor shows the error, restart gopls (VS Code: "Go: Restart Language Server"). If a dependency's symbol is undefined, you may be on an older version:

```bash
go get example.com/lib@latest
go mod tidy
```
