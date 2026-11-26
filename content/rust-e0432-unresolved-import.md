---
error: "error[E0432]: unresolved import"
error_full: |
  error[E0432]: unresolved import `crate::utils`
   --> src/main.rs:1:5
    |
  1 | use crate::utils::helper;
    |     ^^^^^^^^^^^^ could not find `utils` in the crate root
  error[E0432]: unresolved import `tokio`
   --> src/main.rs:2:5
    |
  2 | use tokio::sync::Mutex;
    |     ^^^^^ use of undeclared crate or module `tokio`
cat: rust
description: "A use statement names a path the compiler can't find: a module that isn't declared with mod, a crate missing from Cargo.toml, an item that's behind a disabled feature, or a wrong path."
tldr: "For your own modules add `mod utils;` in main.rs/lib.rs (with src/utils.rs or src/utils/mod.rs) and import with `use crate::utils::helper;`. For external crates run `cargo add tokio --features full`. For items behind features, enable the feature in Cargo.toml. Check the exact path in the crate docs."
keywords: rust error e0432 unresolved import use crate mod could not find in the crate root undeclared crate or module cargo add feature gate self super
related: [rust-e0433-failed-to-resolve, rust-e0463-cant-find-crate, rust-e0603-struct-is-private]
---
## What it means

`use` brings an item into scope by path. E0432 means the compiler walked that path and some segment doesn't exist. The note under the error says which part failed: `could not find X in Y`, `no X in Y`, or `use of undeclared crate or module`.

Its sibling [E0433 failed to resolve](/rust/rust-e0433-failed-to-resolve/) is the same problem in an expression path (`foo::bar()`) instead of a `use`.

## Cause 1: the module isn't declared

Creating `src/utils.rs` is not enough. Rust only compiles files reachable via `mod` declarations from the crate root (`main.rs` or `lib.rs`).

```rust
// src/main.rs
use crate::utils::helper;   // E0432: could not find `utils` in the crate root
```

## Fix 1: add `mod`

```rust
// src/main.rs
mod utils;                  // loads src/utils.rs or src/utils/mod.rs
use crate::utils::helper;
```

For nested modules, declare each level in its parent: `src/net/mod.rs` (or `src/net.rs`) must contain `mod client;` for `src/net/client.rs`.

## Cause 2: crate missing from Cargo.toml

```
use of undeclared crate or module `serde_json`
```

## Fix 2: add the dependency

```bash
cargo add serde_json
cargo add tokio --features full
```

In a workspace, add it to the member crate that uses it, not only the root. Crate names with hyphens are imported with underscores: `my-crate` → `use my_crate::...`.

## Cause 3: the item is behind a disabled feature

Many crates compile items only with a feature flag:

```rust
use tokio::sync::Mutex;            // needs "sync"
use serde::{Serialize, Deserialize}; // needs "derive" for the derive macros
use reqwest::blocking::Client;     // needs "blocking"
```

## Fix 3: enable the feature

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
reqwest = { version = "0.12", features = ["blocking", "json"] }
tokio = { version = "1", features = ["full"] }
```

docs.rs shows "Available on crate feature X only" for gated items.

## Cause 4: wrong path or renamed item

Paths change between crate versions (e.g. `clap::App` was removed in clap 4; it is now `clap::Command`). Check the version in `Cargo.lock` and use that version's docs:

```bash
cargo tree -i clap
cargo doc --open
```

## Cause 5: importing from main.rs inside lib.rs (or binary from library)

In a package with both `src/lib.rs` and `src/main.rs`, they're two crates. In `main.rs`, items from the library are imported by the package name, not `crate`:

```rust
// src/main.rs
use my_app::config::Config;   // not crate::config
```

And `lib.rs` cannot import from `main.rs` at all — move shared code into the library.

## Cause 6: relative path confusion (2018+ edition)

Inside a submodule, `use utils::x;` looks for a crate named `utils`. Use `crate::` (from the root), `super::` (parent) or `self::` (current module):

```rust
use super::models::User;
use crate::db::pool;
```

## Cause 7: the item is private

If the module exists but the item isn't `pub`, you normally get E0603 instead; but a private `mod` in the path can also surface here. Mark it `pub mod` / `pub fn`, or `pub(crate)`.
