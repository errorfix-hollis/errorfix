---
error: "failed to run custom build command for `openssl-sys`"
error_full: |
  error: failed to run custom build command for `openssl-sys v0.9.103`

  Caused by:
    process didn't exit successfully: `/app/target/release/build/openssl-sys-.../build-script-main` (exit status: 101)
    --- stderr
    Could not find directory of OpenSSL installation, and this `-sys` crate cannot
    proceed without this knowledge. If OpenSSL is installed and this crate had
    trouble finding it,  you can set the `OPENSSL_DIR` environment variable for the
    compilation process.
cat: rust
description: "The `openssl-sys` crate links against the system OpenSSL library and its build script couldn't find the OpenSSL headers or pkg-config. Common on fresh Linux machines, slim Docker images, Windows, and when cross-compiling."
tldr: "Install pkg-config and OpenSSL development headers: `sudo apt install pkg-config libssl-dev` (Debian/Ubuntu), `sudo dnf install pkgconf-pkg-config openssl-devel` (Fedora/RHEL), `apk add pkgconfig openssl-dev` (Alpine). Or avoid system OpenSSL: enable the `vendored` feature (`openssl = { version = \"0.10\", features = [\"vendored\"] }`) or switch reqwest to `rustls-tls`."
keywords: rust failed to run custom build command for openssl-sys could not find directory of openssl installation libssl-dev pkg-config openssl_dir vendored rustls reqwest docker alpine cross compile windows cargo build
related: [rust-linker-cc-not-found, rust-e0463-cant-find-crate, linux-e-unable-to-locate-package]
---
## What it means

`openssl-sys` is a thin binding to the C OpenSSL library. Its `build.rs` uses `pkg-config` (on Unix) or the `OPENSSL_DIR` variable to locate `libssl`/`libcrypto` and their headers. If it can't, it panics and cargo reports "failed to run custom build command". You get this transitively through crates like `reqwest`, `native-tls`, `git2`, `sqlx` or `postgres-openssl`.

Read the `--- stderr` part: it says whether `pkg-config` is missing (`The pkg-config command could not be found`) or OpenSSL itself.

## Fix 1: install the development packages

The runtime library alone (`libssl3`) isn't enough; you need the headers and pkg-config.

```bash
# Debian / Ubuntu
sudo apt update && sudo apt install -y pkg-config libssl-dev

# Fedora / RHEL / Rocky
sudo dnf install -y pkgconf-pkg-config openssl-devel

# Arch
sudo pacman -S pkgconf openssl

# Alpine
apk add pkgconfig openssl-dev musl-dev

# macOS (Homebrew)
brew install openssl@3 pkg-config
```

Then rebuild: `cargo clean -p openssl-sys && cargo build`.

On macOS, if it still can't find it: `export OPENSSL_DIR=$(brew --prefix openssl@3)`.

## Fix 2: Docker builds

Slim images (`rust:slim`, `debian:bookworm-slim`) don't include them. Install in the build stage, and the runtime library in the final stage:

```dockerfile
FROM rust:1-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libssl3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/release/myapp /usr/local/bin/
CMD ["myapp"]
```

## Fix 3: drop the OpenSSL dependency (rustls)

Often you don't need OpenSSL at all. For `reqwest`, disable default features and use rustls:

```toml
[dependencies]
reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "json"] }
```

Similar switches exist for many crates (`sqlx` with `runtime-tokio-rustls` or `tls-rustls`, `tokio-tungstenite` with `rustls-tls-webpki-roots`). Run `cargo tree -i openssl-sys` to see which crate pulls it in; it must be switched everywhere or openssl-sys still builds.

## Fix 4: vendored OpenSSL

Build OpenSSL from source and link it statically. Needs a C compiler, `make` and `perl`, but no system OpenSSL:

```toml
[dependencies]
openssl = { version = "0.10", features = ["vendored"] }
```

This is the simplest option for cross-compiling and for static musl binaries.

## Fix 5: Windows

There is no system OpenSSL. Either use rustls (Fix 3), the vendored feature (requires Perl, e.g. Strawberry Perl), or install it with vcpkg:

```powershell
vcpkg install openssl:x64-windows-static-md
$env:VCPKG_ROOT = "C:\vcpkg"
```

## Fix 6: cross-compiling

pkg-config refuses to use host libraries when the target differs. Use `vendored`, rustls, or a tool like `cross` (`cargo install cross`, then `cross build --target aarch64-unknown-linux-gnu`), whose images include OpenSSL for the target. Otherwise set `OPENSSL_DIR` (or `AARCH64_UNKNOWN_LINUX_GNU_OPENSSL_DIR`) to a target build of OpenSSL.
