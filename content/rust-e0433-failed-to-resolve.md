---
error: "error[E0433]: failed to resolve: use of undeclared crate or module"
error_full: |
  error[E0433]: failed to resolve: use of undeclared crate or module `serde_json`
   --> src/main.rs:4:16
    |
  4 |     let v = serde_json::from_str(&data)?;
    |             ^^^^^^^^^^ use of undeclared crate or module `serde_json`
cat: rust
description: "The compiler can't find the first segment of a path like foo::bar. Either the crate isn't in Cargo.toml, the module isn't declared with mod, or the name or path is spelled differently."
tldr: "For external crates add them: `cargo add serde_json` (note: hyphens in crate names become underscores in code). For your own modules declare them with `mod utils;` in main.rs/lib.rs and reference them as `crate::utils::...`. For std types, import them: `use std::collections::HashMap;`."
keywords: rust e0433 failed to resolve use of undeclared crate or module use of undeclared type cargo add mod declaration crate super hyphen underscore cargo.toml dependencies
related: [rust-e0425-cannot-find-value-in-this-scope, rust-e0463-cant-find-crate, rust-e0599-no-method-named-found]
---
## What it means

In a path like `a::b::c`, rustc resolves `a` first. E0433 means `a` is not a known crate, module or type in this scope. Related messages:

- ``use of undeclared crate or module `foo` ``
- ``use of undeclared type `HashMap` ``
- ``could not find `bar` in `foo` ``
- ``use of unresolved module or unlinked crate `foo` `` (wording in newer Rust versions)

## Cause 1: crate not added to Cargo.toml

Extern crates only exist if they're dependencies:

```bash
cargo add serde_json
cargo add tokio --features full
```

or by hand:

```toml
[dependencies]
serde_json = "1"
```

If it's only in `[dev-dependencies]`, it's available in tests and examples, not in `src/`. In a workspace, add it to the member crate's `Cargo.toml`, not just the root.

## Cause 2: hyphen vs underscore

Crate names with hyphens are referenced with underscores in code:

```toml
[dependencies]
rand-core = "0.6"
```

```rust
use rand_core::RngCore;     // not rand-core
```

A few packages also set a different library name via `[lib] name`; the crate's docs.rs page shows the name to use in code. You can also rename a dependency yourself: `foo = { package = "real-name", version = "1" }`.

## Cause 3: your own module isn't declared

Creating `src/utils.rs` is not enough. Declare it in the crate root (`main.rs` or `lib.rs`):

```rust
mod utils;

fn main() {
    utils::helper();
}
```

From another module, refer to it from the crate root:

```rust
use crate::utils::helper;      // absolute
use super::utils::helper;      // relative to parent module
```

In a binary + library package, code in `main.rs` must use the library crate's name: `use my_package::utils;` (with hyphens converted to underscores), not `crate::utils`.

## Cause 4: std types used without import

```rust
let mut m = HashMap::new();    // E0433: use of undeclared type `HashMap`
```

Only a few items are in the prelude. Import the rest:

```rust
use std::collections::HashMap;
use std::fs;
use std::sync::Arc;
```

## Cause 5: feature-gated items

Many crates hide modules behind features. `tokio::fs`, `tokio::net` and `#[tokio::main]` need features (`full`, `fs`, `macros`, `rt-multi-thread`); `serde::Deserialize` derive needs `features = ["derive"]`. Check the crate's docs.rs page — gated items are labelled "Available on crate feature X only".

```bash
cargo add tokio --features macros,rt-multi-thread
```

## Cause 6: edition 2015 paths

In edition 2015, paths in `use` were relative to the crate root and extern crates needed `extern crate foo;`. Make sure `Cargo.toml` has `edition = "2021"` (or `"2024"`) so modern path rules apply.

## Cause 7: wrong module visibility

If the module exists but isn't `pub`, you'll usually get E0603 ("module is private") instead. Make it `pub mod utils;` when using it from another crate.

After fixing, `cargo check` is the fastest way to confirm.
