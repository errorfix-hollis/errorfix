---
error: "error[E0463]: can't find crate for `std`"
error_full: |
  error[E0463]: can't find crate for `std`
    |
    = note: the `wasm32-unknown-unknown` target may not be installed
    = help: consider downloading the target with `rustup target add wasm32-unknown-unknown`
  error[E0463]: can't find crate for `serde`
cat: rust
description: "rustc could not find a crate it was told to link. For `std`/`core` the standard library for your target isn't installed; for other crates you're usually calling rustc directly or using `extern crate` without the dependency in Cargo.toml."
tldr: "For `std`/`core`: install the target's standard library with `rustup target add <target>` (e.g. `rustup target add wasm32-unknown-unknown`), and make sure you use the rustup toolchain, not a distro rustc. For other crates: add them to Cargo.toml (`cargo add serde`) and build with `cargo build`, not plain `rustc`."
keywords: rust error e0463 can't find crate for std core target may not be installed rustup target add wasm32 cross compile extern crate cargo
related: [rust-linker-cc-not-found, rust-e0425-cannot-find-value-in-this-scope, rust-e0599-no-method-named-found]
---
## What it means

E0463 is a linking-stage lookup failure: the compiler needs the compiled metadata (`.rlib`/`.rmeta`) of a crate and can't find it in its search paths. There are two very different situations.

## Cause 1: `can't find crate for std` / `core` when cross-compiling

You built for a target (`--target wasm32-unknown-unknown`, `aarch64-unknown-linux-gnu`, `thumbv7em-none-eabihf`, an Android/iOS target...) whose precompiled standard library isn't installed. rustup only installs the host target by default.

**Fix:**

```bash
rustup target list --installed
rustup target add wasm32-unknown-unknown
# or for a specific toolchain
rustup target add aarch64-unknown-linux-gnu --toolchain nightly
```

If the project has a `rust-toolchain.toml`, add the target there so everyone gets it:

```toml
[toolchain]
channel = "stable"
targets = ["wasm32-unknown-unknown"]
```

Note: the toolchain in use may differ from your default (because of `rust-toolchain.toml` or `rustup override`). Check with `rustup show` and add the target to *that* toolchain.

## Cause 2: a rustc that isn't managed by rustup

If `which rustc` points at `/usr/bin/rustc` (apt, dnf, Homebrew), `rustup target add` doesn't affect it, and the distro may not ship std for other targets.

```bash
which -a rustc cargo
rustup which rustc
```

Uninstall the distro package or put `~/.cargo/bin` first on `PATH`.

## Cause 3: `#![no_std]` targets that have no std at all

Bare-metal targets (`thumbv*-none-*`, `riscv32imac-unknown-none-elf`) only ship `core` (and `alloc`). Any dependency pulling in `std` triggers E0463 for `std`. Mark your crate `#![no_std]` and disable default features of dependencies:

```toml
serde = { version = "1", default-features = false, features = ["derive"] }
```

For targets without any prebuilt library (custom target JSON), build core yourself on nightly: `cargo +nightly build -Z build-std=core,alloc --target my-target.json` (needs `rustup component add rust-src`).

## Cause 4: `can't find crate for serde` (or any other crate)

You wrote `extern crate serde;` or `use serde::...` but the compiler wasn't given the crate.

- The dependency isn't in `Cargo.toml`. Add it:

```bash
cargo add serde --features derive
```

- You compiled with `rustc main.rs` directly. Plain `rustc` knows nothing about Cargo dependencies; use `cargo build` / `cargo run`.
- The crate is a `[dev-dependencies]` entry used in normal (non-test) code, or a `[build-dependencies]` entry used outside `build.rs`. Move it to `[dependencies]`.
- It's an optional dependency whose feature isn't enabled.

In Rust 2018+ editions you rarely need `extern crate` at all; a `use` path plus the Cargo.toml entry is enough. A missing crate in a `use` path usually appears as E0432/E0433 instead.

## Cause 5: stale or mixed build artifacts

After switching toolchains, artifacts compiled by a different rustc version can't be loaded. Run `cargo clean` and rebuild.
