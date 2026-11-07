---
error: "error[E0599]: no method named `x` found for struct `T` in the current scope"
error_full: |
  error[E0599]: no method named `read_to_string` found for struct `File` in the current scope
   --> src/main.rs:5:10
    |
  5 |     file.read_to_string(&mut s)?;
    |          ^^^^^^^^^^^^^^ method not found in `File`
    |
    = help: items from traits can only be used if the trait is in scope
  help: trait `Read` which provides `read_to_string` is implemented but not in scope; perhaps you want to import it
    |
  1 + use std::io::Read;
    |
cat: rust
description: "Rust can't find a method with that name for the value's type. Usually the method comes from a trait that isn't imported, the type is wrapped (Option, Result, Rc, &), a trait bound is missing, or a crate feature is disabled."
tldr: "Read the `help:` lines: if a trait provides the method, add the suggested `use` (e.g. `use std::io::Read;`, `use std::io::Write;`, `use futures::StreamExt;`). If the value is an `Option`/`Result`, unwrap it first (`x?.method()`). For generics, add the trait bound (`T: Display`). For crate methods, enable the needed feature in Cargo.toml."
keywords: rust e0599 no method named found for struct in the current scope trait not in scope use std::io::Read Write iterator method generic trait bound missing feature cargo
related: [rust-e0277-trait-bound-not-satisfied, rust-e0308-mismatched-types, rust-borrow-of-moved-value]
---
## What it means

Method lookup in Rust checks the type's inherent `impl` blocks and every trait that is **in scope** and implemented for the type (after auto-deref). E0599 means none of them has a method with that name. The compiler's `help:` notes are usually exactly right, so read them first.

## Cause 1: the trait isn't imported

Trait methods are only callable when the trait is in scope.

```rust
use std::fs::File;

fn main() -> std::io::Result<()> {
    let mut file = File::open("a.txt")?;
    let mut s = String::new();
    file.read_to_string(&mut s)?;   // E0599
    Ok(())
}
```

Fix: `use std::io::Read;`. Common ones:

| Method | Import |
|---|---|
| `read_to_string`, `read_exact` | `use std::io::Read;` |
| `write_all`, `flush` | `use std::io::Write;` |
| `lines()` on a `BufReader` | `use std::io::BufRead;` |
| `.next().await` on a stream | `use futures::StreamExt;` / `use tokio_stream::StreamExt;` |
| `read_to_end().await` (tokio) | `use tokio::io::AsyncReadExt;` |
| `fmt` helpers like `write!` into `String` | `use std::fmt::Write;` |
| `rng.gen_range()` | `use rand::Rng;` |

Many crates offer a `prelude`: `use some_crate::prelude::*;`.

## Cause 2: the value is wrapped

`Option<T>`, `Result<T, E>`, `Vec<T>` don't have `T`'s methods:

```rust
let n: Option<String> = Some("hi".into());
n.len();          // E0599: no method named `len` found for enum `Option`
```

Fix: unwrap or map:

```rust
let len = n.as_ref().map(|s| s.len()).unwrap_or(0);
// or in a function returning Result/Option:
let file = File::open(path)?;   // ? unwraps the Result
```

Forgetting `?` after a fallible call is the classic case: `File::open(p).read_to_string(..)` fails because `read_to_string` is called on the `Result`.

## Cause 3: missing trait bound on a generic

```rust
fn show<T>(x: T) -> String {
    x.to_string()     // E0599: method `to_string` exists but trait bounds were not satisfied
}
```

Fix: require the trait:

```rust
fn show<T: std::fmt::Display>(x: T) -> String {
    x.to_string()
}
```

Similarly `.clone()` needs `T: Clone`, `.iter()`-based helpers may need `T: IntoIterator`. For derived traits on your own types, add `#[derive(Debug, Clone, PartialEq)]`.

## Cause 4: iterator vs collection

Iterator adapters exist on iterators, not on `Vec` or arrays:

```rust
let v = vec![1, 2, 3];
v.map(|x| x * 2);            // E0599
let doubled: Vec<_> = v.iter().map(|x| x * 2).collect();
```

And `.collect()` / `.sum()` need a type: `let total: i32 = v.iter().sum();`.

## Cause 5: wrong name, version or disabled feature

- Typo or the method was renamed in a newer crate version; check docs.rs for the exact version in `Cargo.lock` (`cargo tree -i crate_name`).
- The method is behind a Cargo feature, e.g. `serde_json`'s `preserve_order`, `tokio`'s `fs`/`net`/`macros`, `reqwest`'s `json`:

```toml
[dependencies]
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["full"] }
```

- Two versions of the same crate in the tree: the trait you imported is from version A, the type is from version B. `cargo tree -d` shows duplicates; align the versions.

## Cause 6: associated function called as a method

`String::from` and `Vec::with_capacity` have no `self`. Call them with `Type::func(...)`, not `value.func(...)`. The compiler says "this is an associated function, not a method".
