---
error: "thread 'main' panicked at called `Option::unwrap()` on a `None` value"
error_full: |
  thread 'main' panicked at src/main.rs:8:38:
  called `Option::unwrap()` on a `None` value
  note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
cat: rust
description: "You called .unwrap() on an Option that was None at runtime: a missing map key, an empty iterator, a failed lookup or an absent env var/argument. Handle the None case instead of unwrapping."
tldr: "Go to the file:line in the panic. Replace `.unwrap()` with real handling: `if let Some(x) = opt { ... }`, `match`, `opt.unwrap_or(default)`, `opt.ok_or(\"msg\")?` in a function returning Result, or at least `.expect(\"why this must exist\")`. Run with `RUST_BACKTRACE=1` to see the call chain."
keywords: rust panicked called option unwrap on a none value thread main panicked unwrap expect if let some unwrap_or ok_or question mark rust_backtrace=1 hashmap get env args
related: [rust-e0308-mismatched-types, rust-e0599-no-method-named-found, rust-borrow-of-moved-value]
---
## What it means

`Option<T>` is either `Some(value)` or `None`. `.unwrap()` returns the value or **panics** if it's `None`. The panic message gives the exact location (`src/main.rs:8:38`); for code inside a library or a helper, get the full call stack:

```bash
RUST_BACKTRACE=1 cargo run
```

The related `called Result::unwrap() on an Err value: ...` panic is the same idea for `Result`, and prints the error after the colon.

## Common sources of None

```rust
map.get("key")             // key not present
vec.first() / vec.last()   // empty vec
vec.get(10)                // index out of range
iter.next()                // iterator exhausted
std::env::args().nth(1)    // argument not given
s.find(':')                // substring not found
s.parse::<u32>().ok()      // parse failed
path.file_name()           // path ends in ".." or is "/"
```

## Fix 1: handle both cases

```rust
match config.get("port") {
    Some(port) => println!("port {port}"),
    None => eprintln!("no port configured"),
}

if let Some(first) = items.first() {
    process(first);
}

// Rust 1.65+: let-else for early exit
let Some(name) = std::env::args().nth(1) else {
    eprintln!("usage: app <name>");
    std::process::exit(1);
};
```

## Fix 2: use a default

```rust
let port = config.get("port").copied().unwrap_or(8080);
let name = user.nickname.clone().unwrap_or_default();     // "" for String
let v = cache.get(&k).cloned().unwrap_or_else(|| compute(&k));
```

`unwrap_or_else` is lazy: the closure only runs when the value is `None`.

## Fix 3: turn None into an error and propagate with `?`

In a function returning `Result`, convert the Option with `ok_or` / `ok_or_else`:

```rust
fn db_url() -> Result<String, String> {
    let url = std::env::var("DATABASE_URL").ok().ok_or("DATABASE_URL not set")?;
    Ok(url)
}
```

With `anyhow`:

```rust
use anyhow::Context;
let user = users.get(&id).context(format!("user {id} not found"))?;
```

Inside a function that itself returns `Option`, `?` works on Options directly:

```rust
fn first_word_len(s: &str) -> Option<usize> {
    Some(s.split_whitespace().next()?.len())
}
```

## Fix 4: if it truly can't be None, use expect

When None means a bug (an invariant), keep the panic but make it explain itself:

```rust
let home = std::env::var_os("HOME").expect("HOME must be set");
```

The panic then reads `HOME must be set`, which is much easier to debug than the generic message.

## Avoiding it in the first place

- Don't `.unwrap()` on user input, files, network data or env vars.
- `clippy` can flag unwraps: add `#![warn(clippy::unwrap_used)]` to your crate root and run `cargo clippy`.
- In tests, `unwrap()` is fine: a panic is a failed test.
