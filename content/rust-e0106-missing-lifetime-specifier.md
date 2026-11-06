---
error: "error[E0106]: missing lifetime specifier"
error_full: |
  error[E0106]: missing lifetime specifier
   --> src/main.rs:1:33
    |
  1 | fn longest(x: &str, y: &str) -> &str {
    |               ----     ----     ^ expected named lifetime parameter
    |
    = help: this function's return type contains a borrowed value, but the signature does not say whether it is borrowed from `x` or `y`
cat: rust
description: A function returns a reference, or a struct/enum holds one, and Rust can't infer which input the reference borrows from. You must name the lifetime — or return/store an owned value instead.
tldr: "Name the lifetime: `fn longest<'a>(x: &'a str, y: &'a str) -> &'a str`. For structs: `struct Parser<'a> { input: &'a str }` and `impl<'a> Parser<'a>`. If the data is created inside the function, return an owned type (`String`, `Vec<T>`) instead of a reference. Use `&'static str` only for string literals."
keywords: rust error e0106 missing lifetime specifier expected named lifetime parameter 'a struct reference return &str string static lifetime elision borrowed value
related: [rust-borrow-of-moved-value, rust-cannot-borrow-as-mutable, rust-e0308-mismatched-types]
---
## What it means

Every reference in Rust has a lifetime — the span during which the data it points to is guaranteed to be valid. Inside function bodies the compiler infers lifetimes, but in **signatures** and **type definitions** they must be either written or covered by the *elision rules*:

1. Each reference parameter gets its own lifetime.
2. If there is exactly one input lifetime, it's used for all output references.
3. If one parameter is `&self` or `&mut self`, its lifetime is used for outputs.

E0106 means those rules didn't produce an answer: there are zero or several candidate inputs, or the reference is in a struct field where nothing is elided.

## Cause 1: function returns a reference, two reference inputs

```rust
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}
```

Rule 2 doesn't apply (two inputs). Declare a lifetime and tie them together:

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

This says: the result lives at most as long as the shorter of `x` and `y`. If the result only ever comes from one argument, tie it to that one only — it gives callers more freedom:

```rust
fn first_word<'a>(s: &'a str, _sep: &str) -> &'a str {
    s.split(' ').next().unwrap_or("")
}
```

## Cause 2: function returns a reference but takes none

```rust
fn make_greeting(name: String) -> &str {   // E0106
    let s = format!("Hello, {name}");
    &s
}
```

There's nothing to borrow from: `s` is dropped when the function returns. Adding `'a` or `'static` won't help (you'd get E0515 "returns a value referencing data owned by the current function"). Return an owned value:

```rust
fn make_greeting(name: &str) -> String {
    format!("Hello, {name}")
}
```

`&'static str` is right only when you actually return a literal or other static data:

```rust
fn level_name(n: u8) -> &'static str {
    match n { 0 => "debug", 1 => "info", _ => "error" }
}
```

## Cause 3: reference in a struct or enum

```rust
struct Parser {
    input: &str,          // E0106
}
```

Struct fields never get elided lifetimes. Add a parameter to the type, and to the `impl`:

```rust
struct Parser<'a> {
    input: &'a str,
}

impl<'a> Parser<'a> {
    fn new(input: &'a str) -> Self {
        Parser { input }
    }
    fn rest(&self) -> &'a str {
        self.input
    }
}
```

Since Rust 2018 you can write `impl Parser<'_>` when methods don't need to name it.

Often the simpler choice is to **own** the data, which removes the lifetime entirely and makes the struct easier to store and return:

```rust
struct Parser {
    input: String,
}
```

Borrowing in structs is best for short-lived views (parsers, iterators); owning is best for things you keep around.

## Cause 4: references inside generic types

The same rule applies to `Vec<&str>`, `Option<&T>`, `HashMap<&str, i32>` in struct fields and in return types:

```rust
struct Index<'a> {
    words: Vec<&'a str>,
}

fn keys<'a>(m: &'a HashMap<String, i32>, prefix: &str) -> Vec<&'a str> {
    m.keys().filter(|k| k.starts_with(prefix)).map(|k| k.as_str()).collect()
}
```

## Cause 5: trait objects and impl Trait returning borrowed data

```rust
fn iter_words(s: &str, sep: &str) -> impl Iterator<Item = &str> { ... }  // E0106
```

Name the lifetime the iterator borrows from:

```rust
fn iter_words<'a>(s: &'a str, sep: &'a str) -> impl Iterator<Item = &'a str> + 'a {
    s.split(sep)
}
```

Boxed trait objects in structs need it too: `Box<dyn Fn(&str) -> bool + 'a>` if the closure borrows, otherwise the default is `'static`.

## Reading the compiler's suggestion

`rustc` usually prints a `help: consider introducing a named lifetime parameter` with the exact signature. It's usually correct mechanically — but first ask whether the function should return an owned value. If you find yourself adding `'a` to half your types, switching a field to `String`/`Vec<T>` or using `Rc`/`Arc` is often the better design.
