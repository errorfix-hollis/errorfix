---
error: "go: go.mod requires go >= 1.xx (running go 1.yy; GOTOOLCHAIN=local)"
error_full: |
  go: go.mod requires go >= 1.23.0 (running go 1.21.6; GOTOOLCHAIN=local)
  go: github.com/example/lib@v1.4.0 requires go >= 1.22 (running go 1.21.6; GOTOOLCHAIN=local)
cat: go
description: "The main module or one of its dependencies declares a newer Go version in its go.mod than the toolchain you are running, and automatic toolchain download is disabled (GOTOOLCHAIN=local)."
tldr: "Install a newer Go (or let Go fetch it: `go env -w GOTOOLCHAIN=auto`), e.g. `go install golang.org/dl/go1.23.4@latest && go1.23.4 download`. In CI/Docker, bump the image (`golang:1.23`) or `go-version` in setup-go. Only lower the `go` line in go.mod if no dependency needs the newer version."
keywords: go mod requires go running go GOTOOLCHAIN=local toolchain go version go.mod go 1.21 1.22 1.23 docker golang image setup-go invalid go version must match format
related: [go-updates-to-go-mod-needed, go-missing-go-sum-entry, go-cannot-find-main-module]
---
## What it means

Since Go 1.21, the `go` line in `go.mod` is a **minimum requirement**, not a hint:

```
module example.com/app

go 1.23.0
toolchain go1.23.4
```

If your installed toolchain is older, Go 1.21+ will by default download the required toolchain automatically (`GOTOOLCHAIN=auto`). You see this error when that switching is disabled (`GOTOOLCHAIN=local`) — common in Linux distro packages, some Docker images and corporate setups.

The second form (`github.com/example/lib@v1.4.0 requires go >= 1.22`) means a **dependency** needs the newer Go, so lowering your own `go` line won't help.

## Check what you have

```bash
go version
go env GOTOOLCHAIN GOROOT
grep -E '^(go|toolchain) ' go.mod
```

`GOTOOLCHAIN` may be set in the environment, in `go env -w` config (`$(go env GOENV)`), or by the distro in `$GOROOT/go.env`.

## Fix 1: let Go download the toolchain

```bash
go env -w GOTOOLCHAIN=auto
go version        # run inside the module; downloads the needed version
```

The toolchain is fetched as a module (`golang.org/toolchain`) through your `GOPROXY`. If you're behind a proxy that blocks it, use Fix 2.

## Fix 2: install a newer Go

Official tarball (Linux amd64 example):

```bash
curl -LO https://go.dev/dl/go1.23.4.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.23.4.linux-amd64.tar.gz
export PATH=/usr/local/go/bin:$PATH
```

Or install a side-by-side version with the existing toolchain:

```bash
go install golang.org/dl/go1.23.4@latest
go1.23.4 download
go1.23.4 build ./...
```

macOS: `brew upgrade go`. Ubuntu's `golang-go` package is often behind — use the tarball, `snap install go --classic`, or the `longsleep/golang-backports` PPA.

## Fix 3: CI and Docker

```dockerfile
FROM golang:1.23 AS build      # match or exceed go.mod
```

GitHub Actions — read the version from go.mod so they never drift:

```yaml
- uses: actions/setup-go@v5
  with:
    go-version-file: go.mod
```

## Fix 4: the dependency upgrade was unintended

If `go get -u` raised the `go` line (Go bumps it when a dependency requires it), you can pin the dependency to an older version that supports your Go:

```bash
go get github.com/example/lib@v1.3.2
go mod tidy
```

Then check the result with `go mod graph | grep example/lib`. Only lower the `go` directive by hand (`go mod edit -go=1.21`) if nothing in the module graph needs more — `go mod tidy` will tell you if it does.

## Related: `invalid go version '1.21.0': must match format 1.23`

Go 1.20 and older don't understand three-part versions like `go 1.21.0` or the `toolchain` line, and fail with this message or `unknown directive: toolchain`. The only real fix is to upgrade to Go 1.21+; editing go.mod to `go 1.21` just moves the problem to the dependencies.
