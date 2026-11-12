---
error: "error[E0603]: struct is private"
error_full: |
  error[E0603]: struct `Config` is private
   --> src/main.rs:3:18
    |
  3 | use crate::config::Config;
    |                    ^^^^^^ private struct
    |
  note: the struct `Config` is defined here
   --> src/config.rs:1:1
    |
  1 | struct Config {
    | ^^^^^^^^^^^^^
cat: rust
description: "You're referring to an item (struct, function, module, enum, constant) from outside the module that defines it, but it isn't marked pub. Rust items are private to their module by default."
tldr: "Add `pub` to the item: `pub struct Config { ... }` (and to every module on the path: `pub mod config;`). Use `pub(crate)` if only your own crate needs it. Fields need their own `pub` too, otherwise you get E0451/E0616. For a dependency's private item, use the public re-export the crate documents instead."
keywords: rust error e0603 struct is private function is private module is private enum is private pub pub(crate) visibility use crate mod re-export e0616 e0451 e0624
related: [rust-e0433-failed-to-resolve, rust-e0425-cannot-find-value-in-this-scope, rust-e0412-cannot-find-type-in-this-scope]
---
## What it means

Everything in Rust is **private to its parent module** unless marked `pub`. Private items are visible inside the module where they're defined and its children, nowhere else. E0603 means the path you wrote resolves to a real item, but you're not allowed to see it from where you are.

The same code covers `function ... is private`, `module ... is private`, `enum ... is private`, `constant ... is private`, `trait ... is private`, etc.

## Fix 1: make the item public

```rust
// src/config.rs
pub struct Config {
    pub port: u16,
    pub host: String,
}

pub fn load() -> Config { /* ... */ }
```

Then from `main.rs`:

```rust
mod config;
use config::Config;
```

## Fix 2: a module on the path is private

Every segment must be visible. With `crate::net::http::Client`, `net`, `http` *and* `Client` all need to be reachable:

```rust
// src/lib.rs
pub mod net;          // was: mod net;

// src/net/mod.rs (or src/net.rs)
pub mod http;
```

If the error says **"module `http` is private"**, this is the fix. Modules declared side by side in `main.rs`/`lib.rs` can use each other's `pub` items even if the `mod` lines aren't `pub`, because private items are visible to the parent module and all its descendants.

## Fix 3: restrict visibility instead of full `pub`

If the item shouldn't be part of your public API:

```rust
pub(crate) struct Config { ... }   // visible anywhere in this crate
pub(super) fn helper() {}         // visible to the parent module
pub(in crate::net) fn raw() {}    // visible inside crate::net
```

The opt-in `unreachable_pub` lint flags `pub` items that can't actually be reached from outside the crate.

## Fix 4: fields and methods are private separately

Making the struct `pub` doesn't make its fields or methods public:

```rust
pub struct Config { port: u16 }    // field still private
```

Using it from another module gives different errors:

- **E0616** (field `port` of struct `Config` is private): reading `c.port`
- **E0451** (field `port` of struct `Config` is private): building `Config { port: 80 }`
- **E0624** (method `x` is private): calling a non-`pub` method from an `impl`

Mark fields `pub`, or keep them private and provide a constructor:

```rust
impl Config {
    pub fn new(port: u16) -> Self { Self { port } }
    pub fn port(&self) -> u16 { self.port }
}
```

## Fix 5: the item belongs to a dependency

You can't change a crate's visibility. The compiler often suggests the public path, e.g.:

```
help: consider importing this struct through its public re-export
  |
1 | use reqwest::Client;
```

Use that re-export. Paths like `serde::de::private::...` or modules named `internal`/`__private` are deliberately hidden; find the supported API in the crate's docs on docs.rs (only public items are listed there). If the item is only public behind a feature flag, enable it in `Cargo.toml`:

```toml
tokio = { version = "1", features = ["full"] }
```

## Re-exporting for a cleaner API

Keep the module private and re-export the item:

```rust
// src/lib.rs
mod config;
pub use config::Config;   // users write mycrate::Config
```
