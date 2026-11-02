---
error: "error[E0308]: mismatched types"
error_full: |
  error[E0308]: mismatched types
   --> src/main.rs:4:18
    |
  4 |     let n: u32 = "5";
    |            ---   ^^^ expected `u32`, found `&str`
    |            |
    |            expected due to this
cat: rust
description: An expression has a different type than the place it's used requires. Rust never converts between types implicitly, so you must parse, convert, borrow, dereference or wrap the value explicitly.
tldr: "Read the `expected X, found Y` line and convert explicitly: `.parse::<u32>()?` for strings to numbers, `.to_string()`/`String::from` for `&str`→`String`, `&s` / `.as_str()` for `String`→`&str`, `as`/`into()`/`try_into()` between number types, `Some(x)` / `Ok(x)` for Option/Result. Remove a trailing `;` if it found `()`."
keywords: rust error e0308 mismatched types expected found string &str u32 i32 usize unit type () semicolon option result into parse as_str try_into
related: [rust-borrow-of-moved-value, rust-cannot-borrow-as-mutable, rust-linker-cc-not-found]
---
## What it means

The compiler inferred or was told one type for a spot (a variable annotation, a function parameter, a return type, a match arm) and the expression you put there has another. The `expected ..., found ...` label is the key. `rustc --explain E0308` gives the official description.

## Fix 1: `expected (), found X` — a semicolon or missing return

A block's value is its last expression *without* a semicolon. Adding `;` turns it into a statement of type `()`.

```rust
fn double(x: i32) -> i32 {
    x * 2;          // error: expected `i32`, found `()`
}
```

Remove the semicolon (`x * 2`) or write `return x * 2;`.

The reverse: `if` without `else` has type `()`, so using its value fails:

```rust
let label = if n > 0 { "positive" };          // error
let label = if n > 0 { "positive" } else { "non-positive" };
```

## Fix 2: `String` vs `&str`

```rust
let s: String = "hello";            // expected `String`, found `&str`
let s: String = "hello".to_string(); // or String::from("hello"), "hello".into()

fn greet(name: &str) {}
let owned = String::from("Ann");
greet(owned);                        // expected `&str`, found `String`
greet(&owned);                       // deref coercion: &String -> &str
greet(owned.as_str());
```

Comparing in a `match` on a `String`: `match s.as_str() { "a" => ..., _ => ... }`.

## Fix 3: numbers of different types

Rust doesn't mix `i32`, `u32`, `usize`, `f64` automatically:

```rust
let len: usize = v.len();
let n: i32 = 10;
let total = len + n;                 // error

let total = len + n as usize;        // `as` truncates/wraps silently
let total = len + usize::try_from(n)?; // checked conversion
let x: f64 = n.into();               // lossless conversions via From/Into
```

Literals can be typed with a suffix: `10u64`, `2.0f32`.

Strings to numbers need parsing:

```rust
let n: u32 = "5".parse().expect("not a number");
let n: u32 = input.trim().parse()?;   // trim the newline from read_line!
```

## Fix 4: `Option` / `Result` wrapping

```rust
fn find() -> Option<i32> {
    42                    // expected `Option<i32>`, found integer
}
```

Wrap it: `Some(42)`. For `Result`, `Ok(value)`. The other direction — `expected i32, found Option<i32>` — means you must handle the `None`/`Err` case:

```rust
let v = map.get("k").copied().unwrap_or(0);
let v = text.parse::<i32>()?;      // in a fn returning Result
if let Some(v) = maybe { ... }
```

## Fix 5: references vs values

`expected i32, found &i32` is common when iterating:

```rust
let v = vec![1, 2, 3];
let sum: i32 = v.iter().map(|x| x * 2).sum(); // fine (ops work on &i32)
let first: i32 = v.iter().next().unwrap();    // error: found `&i32`
let first: i32 = *v.iter().next().unwrap();   // dereference
let first: i32 = v[0];                        // Copy types index by value
```

Use `.copied()` / `.cloned()` on iterators, or `into_iter()` to get owned values.

## Fix 6: match / if arms with different types

All arms must produce the same type. Returning `i32` in one arm and `&str` in another fails. Make them agree, or return an enum or `Box<dyn Trait>`. For closures or iterators with different concrete types, `impl Trait` in return position needs a single concrete type — use `Box<dyn Iterator<Item = T>>` when branches differ.
