---
error: "error[E0277]: the trait bound is not satisfied"
error_full: |
  error[E0277]: the trait bound `MyType: Serialize` is not satisfied
  error[E0277]: `Point` doesn't implement `std::fmt::Display`
  error[E0277]: the `?` operator can only be used in a function that returns `Result` or `Option`
cat: rust
description: You used a type where a trait implementation is required (by a generic bound, a macro like println!, or the ? operator) but the type doesn't implement that trait. Derive or implement the trait, convert the value, or change the bound.
tldr: "Read which trait is missing and for which type. Usually `#[derive(Debug, Clone, PartialEq, serde::Serialize)]` fixes it; for `Display` write `impl fmt::Display for T`. For `?` errors make the function return `Result<_, E>` where your error converts via `From` (e.g. `Result<(), Box<dyn std::error::Error>>`). For serde check that the crate feature `derive` is enabled and only one serde version is in `cargo tree -d`."
keywords: rust e0277 the trait bound is not satisfied doesn't implement display debug derive serialize serde ? operator can only be used in a function that returns result send sync generic bound impl trait
related: [rust-e0308-mismatched-types, rust-borrow-of-moved-value, rust-cannot-borrow-as-mutable]
---
## What it means

Some code requires a type `T` to implement a trait (`T: Trait`). The compiler checked your concrete type and found no implementation. The message names both: ``the trait bound `MyType: Serialize` is not satisfied`` means "`MyType` must implement `Serialize` here". Further down, `note: required by a bound in ...` shows *which* function or impl introduced the requirement.

## Cause 1: missing derive

```rust
struct Point { x: i32, y: i32 }

let p = Point { x: 1, y: 2 };
println!("{:?}", p);            // E0277: `Point` doesn't implement `Debug`
let q = p.clone();              // E0599/E0277 for Clone
let mut set = std::collections::HashSet::new();
set.insert(p);                  // needs Eq + Hash
```

Fix:

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct Point { x: i32, y: i32 }
```

Deriving requires every field to implement the trait too; the compiler will point at the field that doesn't.

## Cause 2: Display for `{}`

`{}` needs `std::fmt::Display`, which can't be derived:

```rust
use std::fmt;

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}
```

Or just use `{:?}` with `#[derive(Debug)]`.

## Cause 3: serde Serialize/Deserialize

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

```rust
#[derive(serde::Serialize, serde::Deserialize)]
struct User { name: String }
```

If you derived it and still get E0277, you may have **two versions of serde** (or of the crate defining the trait): your type implements version A's trait, the library wants version B's. Check:

```bash
cargo tree -d          # lists duplicated crates
cargo tree -i serde
```

Align versions in `Cargo.toml` (or `cargo update -p serde`). The same applies to `rand`, `tokio`, `http` and other crates whose traits are shared.

## Cause 4: `?` in a function that doesn't return Result/Option

```rust
fn main() {
    let s = std::fs::read_to_string("a.txt")?;   // E0277
}
```

Fix by returning a Result:

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let s = std::fs::read_to_string("a.txt")?;
    Ok(())
}
```

A related E0277: ```?` couldn't convert the error to `MyError` `` means there's no `From<io::Error> for MyError`. Implement `From`, use `.map_err(...)`, or use `anyhow::Result` / `thiserror` with `#[from]`.

## Cause 5: wrong type passed to a generic

```rust
let total: i32 = vec![1u8, 2, 3].iter().sum();   // E0277: Sum<&u8> not implemented for i32
let total: u32 = vec![1u8, 2, 3].iter().map(|&x| x as u32).sum();
```

Also common: passing `&str` where `String` is required, or `&T` where `T` is required. Convert with `.to_string()`, `.clone()`, `*x`, or `.into()`.

## Cause 6: `Send` / `Sync` with threads and async

``error[E0277]: `Rc<...>` cannot be sent between threads safely`` appears with `std::thread::spawn` or `tokio::spawn`. Use `Arc` instead of `Rc`, `Mutex`/`RwLock` instead of `RefCell`, and don't hold a non-`Send` value (e.g. a `std::sync::MutexGuard`) across an `.await`: drop it in an inner block before awaiting.

## Cause 7: your generic function lacks the bound

```rust
fn largest<T>(xs: &[T]) -> &T {        // E0277: binary operation `>` cannot be applied
    ...
}
fn largest<T: PartialOrd>(xs: &[T]) -> &T { ... }
```

Add the bound the compiler suggests in its `help:` line.
