---
error: "thread 'main' panicked at 'called `Result::unwrap()` on an `Err` value'"
error_full: |
  thread 'main' panicked at src/main.rs:5:47:
  called `Result::unwrap()` on an `Err` value: Os { code: 2, kind: NotFound, message: "No such file or directory" }
  note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
cat: rust
description: "You called `.unwrap()` on a `Result` that was an `Err`, so the program panicked. The text after `Err` value: is the actual error; fix that, then replace `unwrap()` with real error handling."
tldr: "Read the error after `Err value:` (e.g. `NotFound`, `ParseIntError`, `ConnectionRefused`) and fix its cause. Then handle it: propagate with `?` from a function returning `Result` (`fn main() -> Result<(), Box<dyn std::error::Error>>`), use `match`/`if let Err(e)`, `.unwrap_or(default)`, or `.expect(\"context\")` for a clearer message. Run with `RUST_BACKTRACE=1` to find the call site."
keywords: rust called result unwrap on an err value panicked thread main unwrap expect question mark operator error handling RUST_BACKTRACE NotFound ParseIntError anyhow
related: [rust-called-option-unwrap-on-a-none-value, rust-e0277-trait-bound-not-satisfied, rust-e0308-mismatched-types]
---
## What it means

`Result<T, E>::unwrap()` returns the `Ok` value or panics with the `Debug` form of the `Err`. The panic location (`src/main.rs:5:47`) is the line with the `unwrap()`. The payload tells you what actually went wrong:

| Payload | Usual cause |
|---|---|
| `Os { code: 2, kind: NotFound, ... }` | file path wrong, relative to the working dir |
| `Os { code: 13, kind: PermissionDenied, ... }` | no read/write permission |
| `ParseIntError { kind: InvalidDigit }` | parsing a string with spaces/newline/letters |
| `ParseIntError { kind: Empty }` | parsing an empty string |
| `Os { code: 111, kind: ConnectionRefused, ... }` | nothing listening on that host/port |
| `Error("missing field ...")` | serde: JSON/TOML doesn't match the struct |

If the panic is inside a library, get the full stack:

```bash
RUST_BACKTRACE=1 cargo run
```

## Cause 1: file not found because of the working directory

Relative paths resolve against the directory you run from, not the source file. `cargo run` runs from where you invoke it; tests run from the crate root.

```rust
let text = std::fs::read_to_string("data/input.txt").unwrap();
```

Use a path relative to the crate at compile time if the file ships with the code:

```rust
let path = concat!(env!("CARGO_MANIFEST_DIR"), "/data/input.txt");
```

or embed it: `include_str!("../data/input.txt")`.

## Cause 2: parsing input with a trailing newline

```rust
let mut line = String::new();
std::io::stdin().read_line(&mut line).unwrap();
let n: i32 = line.parse().unwrap();   // Err(InvalidDigit): line is "42\n"
```

Trim first:

```rust
let n: i32 = line.trim().parse().unwrap();
```

## Fix: handle the error instead of unwrapping

Propagate with `?` (works in `main` too):

```rust
use std::error::Error;
use std::fs;

fn main() -> Result<(), Box<dyn Error>> {
    let text = fs::read_to_string("config.toml")?;
    let port: u16 = text.trim().parse()?;
    println!("port {port}");
    Ok(())
}
```

Handle specific cases:

```rust
match fs::read_to_string("config.toml") {
    Ok(text) => use_config(&text),
    Err(e) if e.kind() == std::io::ErrorKind::NotFound => use_defaults(),
    Err(e) => return Err(e.into()),
}
```

Fall back to a default:

```rust
let port: u16 = std::env::var("PORT").ok()
    .and_then(|s| s.parse().ok())
    .unwrap_or(8080);
```

Or keep the panic but make it readable:

```rust
let f = File::open(&path).expect(&format!("failed to open {path}"));
// clippy prefers: .unwrap_or_else(|e| panic!("failed to open {path}: {e}"))
```

For applications, the `anyhow` crate adds context cheaply:

```rust
use anyhow::{Context, Result};

fn load(path: &str) -> Result<String> {
    std::fs::read_to_string(path).with_context(|| format!("reading {path}"))
}
```

## Cause 3: `unwrap()` on a Mutex lock

`called Result::unwrap() on an Err value: PoisonError { .. }` means another thread panicked while holding the lock. Fix the original panic (it is earlier in the output); if you want to continue anyway, use `lock().unwrap_or_else(|e| e.into_inner())`.

## Cause 4: serde deserialization

`Error("missing field `name`", line: 1, column: 20)` means the input lacks a field the struct requires. Make it optional (`Option<String>`) or give it `#[serde(default)]`. Check the input with the [JSON formatter](/tools/json-formatter/).
