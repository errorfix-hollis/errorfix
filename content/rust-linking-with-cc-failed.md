---
error: "error: linking with `cc` failed: exit status: 1"
error_full: |
  error: linking with `cc` failed: exit status: 1
    |
    = note: LC_ALL="C" PATH="..." "cc" "-m64" "/tmp/rustcXXXX/symbols.o" ...
    = note: /usr/bin/ld: cannot find -lssl: No such file or directory
            /usr/bin/ld: cannot find -lcrypto: No such file or directory
            collect2: error: ld returned 1 exit status
cat: rust
description: "rustc compiled your code, but the system linker (cc / ld) failed. The real reason is in the last note lines: usually a missing native library (-lssl, -lpq, -lsqlite3), missing Xcode tools on macOS, or a cross-compile target without a matching linker."
tldr: "Read the last `note:` lines. `cannot find -lfoo` → install the dev package (`sudo apt install libssl-dev pkg-config`, `libpq-dev`, `libsqlite3-dev`). macOS `xcrun: error` or `ld: library not found` → `xcode-select --install`. Cross-compiling → install the target linker and set it in `.cargo/config.toml` (`[target.aarch64-unknown-linux-gnu] linker = \"aarch64-linux-gnu-gcc\"`), or use `cross`."
keywords: rust error linking with cc failed exit status 1 ld cannot find -lssl -lpq -lsqlite3 collect2 ld returned 1 exit status xcode-select macos cross compile linker cargo config mold lld undefined reference
related: [rust-linker-cc-not-found, rust-failed-to-run-custom-build-command-for-openssl-sys, git-xcrun-error-invalid-active-developer-path]
---
## What it means

Rust uses the platform C toolchain to link the final binary. `linking with cc failed` means `cc` ran but returned an error. The first huge `note:` line is just the command line; scroll to the **end** of the output for the real error from `ld`.

(If the message is `linker 'cc' not found`, no C compiler is installed at all: `sudo apt install build-essential`.)

## Cause 1: `cannot find -l<name>`: missing native library

A crate links against a system library that isn't installed (or only the runtime `.so` is, without the `.so` symlink from the `-dev` package).

| Linker says | Debian/Ubuntu | Fedora | macOS |
|---|---|---|---|
| `-lssl`, `-lcrypto` | `libssl-dev pkg-config` | `openssl-devel` | `brew install openssl@3` |
| `-lpq` (diesel, postgres) | `libpq-dev` | `libpq-devel` | `brew install libpq` |
| `-lsqlite3` | `libsqlite3-dev` | `sqlite-devel` | usually present |
| `-lmysqlclient` | `libmysqlclient-dev` | `mysql-devel` | `brew install mysql-client` |
| `-lz` | `zlib1g-dev` | `zlib-devel` | present |
| `-lxcb`, `-lX11` (GUI) | `libxcb1-dev libx11-dev` | `libxcb-devel libX11-devel` | n/a |

```bash
sudo apt install build-essential pkg-config libssl-dev
cargo clean && cargo build
```

On macOS with Homebrew, tell the linker where the lib lives, e.g. `export RUSTFLAGS="-L $(brew --prefix libpq)/lib"`.

Alternatively avoid the native dependency: many crates have a pure-Rust feature, e.g. `reqwest = { version = "0.12", default-features = false, features = ["rustls-tls"] }`, or `openssl = { version = "0.10", features = ["vendored"] }`, or `rusqlite` with `features = ["bundled"]`.

## Cause 2: macOS command line tools missing or broken

```
xcrun: error: invalid active developer path
ld: library not found for -liconv
```

Usually after a macOS upgrade:

```bash
xcode-select --install
# if already installed but broken:
sudo xcode-select --reset
```

## Cause 3: cross-compiling with the host linker

Building for another target (`--target aarch64-unknown-linux-gnu`, `x86_64-pc-windows-gnu`, musl) with plain `cc` gives errors like `file in wrong format` or `unrecognized option`. Install a cross linker and configure it:

```bash
sudo apt install gcc-aarch64-linux-gnu
rustup target add aarch64-unknown-linux-gnu
```

```toml
# .cargo/config.toml
[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"
```

Or use [`cross`](https://github.com/cross-rs/cross) (`cargo install cross` then `cross build --target ...`), which runs in a container with the right toolchain.

## Cause 4: `undefined reference to ...`

Symbols are missing at link time: wrong library version, a `-sys` crate built against a different lib than the one found, or link order issues in a `build.rs`. Check the `build.rs` emits `cargo:rustc-link-lib=...` and `cargo:rustc-link-search=...`, then `cargo clean`.

## Cause 5: linker killed / out of memory

`signal: 9, SIGKILL` or `collect2: fatal error: ld terminated with signal 9` means the OS killed the linker, common in small CI runners and Docker. Add swap, reduce parallelism (`cargo build -j 2`), lower debug info (`[profile.dev] debug = 1`), or use a faster, leaner linker such as mold or lld:

```toml
[target.x86_64-unknown-linux-gnu]
rustflags = ["-C", "link-arg=-fuse-ld=mold"]
```
