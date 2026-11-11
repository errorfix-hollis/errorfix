---
error: "error[E0412]: cannot find type `X` in this scope"
error_full: |
  error[E0412]: cannot find type `HashMap` in this scope
   --> src/main.rs:4:12
    |
  4 |     cache: HashMap<String, u32>,
    |            ^^^^^^^ not found in this scope
    |
  help: consider importing this struct
    |
  1 + use std::collections::HashMap;
cat: rust
description: "The compiler can't resolve a type name at that point: it isn't imported with `use`, is misspelled, lives in another module that isn't declared or public, is a generic parameter you forgot to declare, or needs a crate feature."
tldr: "Import it (`use std::collections::HashMap;`, `use crate::models::User;`) as the compiler's help line suggests, declare the module with `mod models;`, make the type `pub`, declare generics on the impl (`impl<T> Foo<T>`), or enable the crate feature that provides it in Cargo.toml."
keywords: rust error e0412 cannot find type in this scope not found use import hashmap mod pub generic parameter impl crate feature cargo
related: [rust-e0425-cannot-find-value-in-this-scope, rust-e0433-failed-to-resolve, rust-e0463-cant-find-crate]
---
## What it means

E0412 is the type version of E0425 (`cannot find value`). Rust only knows names that are defined in the current module, brought in with `use`, or part of the prelude (`Vec`, `String`, `Option`, `Result`, `Box`...). Anything else must be imported or written with its full path.

Always read the `help:` lines first; rustc often prints the exact `use` line you need.

## Cause 1: missing use for a std type

Common std types are **not** in the prelude:

```rust
use std::collections::{HashMap, HashSet, BTreeMap, VecDeque};
use std::sync::{Arc, Mutex, RwLock};
use std::rc::Rc;
use std::cell::RefCell;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use std::fmt;              // for fmt::Display, fmt::Result
```

Or use the full path inline: `std::collections::HashMap<String, u32>`.

## Cause 2: type from another file in your crate

Given `src/models.rs` with `pub struct User`, the module must be declared once (in `main.rs` or `lib.rs`) and the type imported where it's used:

```rust
// src/main.rs
mod models;            // declares the module: loads src/models.rs
use models::User;
```

From a nested module, start the path at the crate root:

```rust
use crate::models::User;
use super::User;       // from the parent module
```

If the type isn't `pub`, you'll get E0603 (`struct User is private`) instead. Add `pub` (or `pub(crate)`) to the struct.

## Cause 3: type from an external crate

Add the crate and import the type:

```bash
cargo add serde --features derive
cargo add chrono
```

```rust
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
```

Some types exist only behind a feature flag. For example `tokio::net::TcpStream` needs the `net` feature, and `reqwest::blocking::Client` needs `blocking`:

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["blocking", "json"] }
```

Check the crate's docs.rs page; feature-gated items show "Available on crate feature X only".

## Cause 4: undeclared generic parameter

```rust
struct Wrapper<T> { inner: T }

impl Wrapper<T> {          // E0412: cannot find type `T`
    fn get(&self) -> &T { &self.inner }
}

impl<T> Wrapper<T> {       // OK: declare T after impl
    fn get(&self) -> &T { &self.inner }
}
```

The same applies to functions: `fn first<T>(v: &[T]) -> &T`.

## Cause 5: typo or wrong case

Types are `UpperCamelCase`: `String`, not `string`; `Vec`, not `vec` (`vec!` is a macro); `i32`, not `int`; `f64`, not `float`; `bool`, not `Bool`. rustc usually suggests `a struct with a similar name exists`.

## Cause 6: associated types and Self

Inside a trait impl, use `Self::Item` (or the concrete type), not a bare `Item`:

```rust
impl Iterator for Counter {
    type Item = u32;
    fn next(&mut self) -> Option<Self::Item> { None }
}
```

## Cause 7: cfg-gated code

If a type is defined under `#[cfg(feature = "x")]`, `#[cfg(test)]` or `#[cfg(target_os = "linux")]`, it doesn't exist in other builds. Gate the code that uses it the same way, or enable the feature: `cargo build --features x`.
