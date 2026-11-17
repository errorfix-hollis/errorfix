---
error: "error[E0384]: cannot assign twice to immutable variable"
error_full: |
  error[E0384]: cannot assign twice to immutable variable `count`
   --> src/main.rs:4:5
    |
  2 |     let count = 0;
    |         ----- first assignment to `count`
  3 |
  4 |     count += 1;
    |     ^^^^^^^^^^ cannot assign twice to immutable variable
    |
  help: consider making this binding mutable
    |
  2 |     let mut count = 0;
    |         +++
cat: rust
description: "Rust variables are immutable by default. You assigned to a `let` binding a second time (including `+=`) without declaring it `mut`."
tldr: "Declare the binding as mutable: `let mut count = 0;`. For function parameters write `fn f(mut x: i32)`; for pattern bindings `let (mut a, b) = ...` or `for mut x in ...`. Or shadow it with a new `let` if you don't need mutation."
keywords: rust error e0384 cannot assign twice to immutable variable let mut mutable binding shadowing function parameter for loop
related: [rust-cannot-borrow-as-mutable, rust-borrow-of-moved-value, rust-e0308-mismatched-types]
---
## What it means

`let x = 5;` creates an immutable binding. Any later `x = ...`, `x += ...` or similar is rejected at compile time with E0384. The compiler's `help:` line almost always shows the exact fix.

The related error for *references* is E0596 (`cannot borrow x as mutable, as it is not declared as mutable`), which happens when you call a `&mut self` method like `v.push(1)` on a non-`mut` binding. The fix is the same: add `mut`.

## Fix 1: add `mut`

```rust
fn main() {
    let mut count = 0;
    count += 1;
    println!("{count}");
}
```

## Cause 2: function parameters

Parameters are immutable bindings too:

```rust
fn shout(s: String) {
    s.push('!');      // E0596
    s = s.to_uppercase();  // E0384
}
```

```rust
fn shout(mut s: String) -> String {
    s.push('!');
    s = s.to_uppercase();
    s
}
```

`mut` on a parameter is local to the function; callers aren't affected.

## Cause 3: loop variables and patterns

```rust
for x in 0..3 {
    x *= 2;           // E0384
}
```

```rust
for mut x in 0..3 {
    x *= 2;
    println!("{x}");
}
```

Each binding in a pattern needs its own `mut`:

```rust
let (mut a, b) = (1, 2);
a += b;
if let Some(mut v) = maybe { v += 1; }
```

## Cause 4: deferred initialization

Declaring first and assigning later is allowed once without `mut`:

```rust
let x;
if cond { x = 1; } else { x = 2; }   // fine: each path assigns once
```

But assigning in a loop, or on two paths that can both run, is E0384:

```rust
let total;
for n in nums {
    total = n;        // may assign more than once
}
```

Use `let mut total = 0;`, or better compute it as an expression:

```rust
let total: i32 = nums.iter().sum();
let x = if cond { 1 } else { 2 };
```

## Alternative: shadowing

If you only need a transformed value, rebind with a new `let` instead of mutating:

```rust
let input = "  42 ";
let input = input.trim();
let input: i32 = input.parse().unwrap();
```

Shadowing can even change the type, which `mut` cannot.

## Inside closures and structs

- A closure that mutates a captured variable needs both the variable and the closure binding to be `mut`: `let mut count = 0; let mut inc = || count += 1; inc();`.
- Struct fields have no `mut` of their own: to change `p.x`, the binding `p` must be `let mut p`, or you need `&mut p`. For mutation through a shared reference use `Cell`/`RefCell` (or `Mutex` across threads).
