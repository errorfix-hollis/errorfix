---
error: "go: errors parsing go.mod: invalid go version: must match format 1.23"
error_full: |
  go: errors parsing go.mod:
  /home/me/app/go.mod:3: invalid go version '1.22.1': must match format 1.23
  go.mod:3: invalid go version '1.21.0': must match format 1.23
cat: go
description: "Your go.mod uses a three-part go version (like 1.22.1) or a toolchain line, written by Go 1.21+, but you're building with an older Go (1.20 or earlier) that only understands 1.N."
tldr: "Best fix: upgrade Go to 1.21 or newer (`go version` to check), which understands `go 1.22.1` and auto-downloads the right toolchain. If you must stay on old Go, edit go.mod to `go 1.20` (two parts) and remove the `toolchain` line, or run `go mod edit -go=1.20 -toolchain=none` with a newer Go."
keywords: go golang errors parsing go.mod invalid go version must match format 1.23 1.22.1 1.21.0 toolchain directive go mod edit older go version ci docker golang image
related: [go-module-requires-go-running-go, go-updates-to-go-mod-needed, go-cannot-find-main-module]
---
## What it means

Since **Go 1.21**, the `go` line in `go.mod` can include a patch version (`go 1.22.1`), and there's a new `toolchain` directive:

```
module example.com/app

go 1.22.1

toolchain go1.23.4
```

Go 1.20 and earlier only accept `go 1.N`. When an old Go reads this file it fails with *invalid go version ... must match format 1.23* (the "1.23" in the message is just an example of the expected format, not a requirement).

Typical situations: `go mod tidy` on a developer machine with new Go rewrote the line, and then CI, a Docker image or a colleague with older Go breaks.

## Fix 1: upgrade Go (recommended)

Go before 1.21 is out of support. Check and upgrade:

```bash
go version
```

- **Docker:** bump the image, e.g. `FROM golang:1.23` instead of `golang:1.19`.
- **GitHub Actions:** read the version from go.mod so it always matches:

```yaml
- uses: actions/setup-go@v5
  with:
    go-version-file: go.mod
```

- **Linux tarball:**

```bash
curl -LO https://go.dev/dl/go1.23.4.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.23.4.linux-amd64.tar.gz
```

- Debian/Ubuntu apt `golang` packages are often old; use the tarball, `snap install go --classic`, or a backports package.

With Go 1.21+, if go.mod asks for a newer version than installed, Go downloads that toolchain automatically (controlled by `GOTOOLCHAIN`, default `auto`).

## Fix 2: make go.mod readable by old Go

If you really must support Go 1.20 builds, use a two-part version and drop the toolchain line. With a new Go:

```bash
go mod edit -go=1.20 -toolchain=none
go mod tidy
```

Or edit by hand:

```
go 1.20
```

This only works if your code and dependencies don't need newer language features or stdlib APIs. If a dependency requires a newer Go, `go mod tidy` will bump the line back up, so you'd have to downgrade that dependency (`go get example.com/dep@v1.4.0`).

## Fix 3: the error is in a dependency's go.mod

If the path in the message is under `$GOPATH/pkg/mod/...`, a dependency was published with a three-part version. You can't edit it; upgrade your Go or pin an older release of that dependency.

## Fix 4: wrong `go` binary on PATH

You may have installed new Go but an older one runs first:

```bash
which -a go
go env GOROOT
```

Remove the old one or fix `PATH` (e.g. put `/usr/local/go/bin` before `/usr/bin`). IDEs (VS Code, GoLand) can be configured with their own GOROOT; check that too.

## Related errors

- `go.mod requires go >= 1.23 (running go 1.21; GOTOOLCHAIN=local)`: see [module requires go ... running go](/go/go-module-requires-go-running-go/).
- `unknown directive: toolchain`: also old Go (≤1.20) reading a `toolchain` line; same fixes.
