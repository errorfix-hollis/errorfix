---
error: "error[E0282]: type annotations needed"
error_full: |
  error[E0282]: type annotations needed
   --> src/main.rs:2:9
    |
  2 |     let nums = "1 2 3".split(' ').map(|s| s.parse().unwrap()).collect();
    |         ^^^^
    |
  help: consider giving `nums` an explicit type
    |
  2 |     let nums: /* Type */ = "1 2 3".split(' ').map(|s| s.parse().unwrap()).collect();
    |             ++++++++++++
cat: rust
description: "The compiler can't infer a concrete type for a generic value. It happens most with `collect()`, `parse()`, `into()`, `Default::default()`, empty collections and generic functions whose type parameter isn't used in the arguments."
tldr: "Annotate the binding (`let v: Vec<i32> = ...collect();`) or use turbofish on the call (`.collect::<Vec<_>>()`, `s.parse::<i32>()`, `Vec::<String>::new()`). For `?` in closures, annotate the return type, e.g. `Ok::<_, MyError>(value)`."
keywords: rust error e0282 type annotations needed collect parse turbofish into default vec new consider giving an explicit type cannot infer type type inference e0283 e0284
related: [rust-e0308-mismatched-types, rust-e0277-trait-bound-not-satisfied, rust-e0599-no-method-named-found]
---
## What it means

Rust infers types from how values are used, but some functions are generic over their **return** type. `collect()` can build a `Vec`, `HashSet`, `String`, `HashMap`...; `parse()` can produce any `FromStr` type. If nothing later in the function pins it down, the compiler stops with E0282 and points at the binding or call it couldn't solve. Close relatives: E0283 ("type annotations needed: cannot satisfy ...") and E0284.

There are two ways to supply the type:

```rust
let v: Vec<i32> = iter.collect();         // annotate the variable
let v = iter.collect::<Vec<i32>>();       // turbofish on the method
```

`_` lets the compiler fill in the parts it *can* infer: `Vec<_>`.

## Cause 1: `collect()` without a target collection

```rust
// Error
let words = text.split_whitespace().collect();

// Fix
let words: Vec<&str> = text.split_whitespace().collect();
let words = text.split_whitespace().collect::<Vec<_>>();
let unique: std::collections::HashSet<_> = text.split_whitespace().collect();
```

Collecting `Result`s works too: `let nums: Result<Vec<i32>, _> = iter.map(|s| s.parse()).collect();`

## Cause 2: `parse()` without a target type

```rust
let n = input.trim().parse().unwrap();          // E0282
let n: u32 = input.trim().parse().unwrap();     // ok
let n = input.trim().parse::<u32>().unwrap();   // ok
```

In the example at the top both problems combine: `parse()` needs a type and `collect()` needs a collection — `collect::<Vec<i32>>()` solves both, since the element type flows back into `parse`.

## Cause 3: empty collections and `None`

```rust
let mut list = Vec::new();   // fine only if something is pushed later
let x = None;                // E0282 if never constrained

let mut list: Vec<String> = Vec::new();
let x: Option<u8> = None;
let list = Vec::<String>::new();
```

The error appears when the value is never used in a way that reveals its element type (e.g. only `.len()` is called).

## Cause 4: `into()`, `Default::default()`, `sum()`

These are generic over the output:

```rust
let total = v.iter().sum();            // E0282 / E0283
let total: i64 = v.iter().sum();       // ok
let total = v.iter().sum::<i64>();     // ok

let s: String = "hi".into();
let cfg: Config = Default::default();
```

## Cause 5: `?` inside closures and async blocks

The compiler can't infer the error type of a closure or `async` block that uses `?`:

```rust
let fut = async {
    let data = fetch().await?;
    Ok(data)               // E0282: type of the error unknown
};

// Fix: name the Result type on the final value
let fut = async {
    let data = fetch().await?;
    Ok::<_, anyhow::Error>(data)
};
```

The same works for closures: `|| -> Result<(), MyError> { ...; Ok(()) }`.

## Cause 6: generic function with an unused type parameter

```rust
fn make<T: Default>() -> T { T::default() }
let x = make();            // E0282
let x = make::<u64>();     // ok
```

Libraries like `serde_json::from_str`, `reqwest`'s `.json()` and `sqlx::query_as` follow the same pattern — annotate the result: `let user: User = serde_json::from_str(s)?;`.
