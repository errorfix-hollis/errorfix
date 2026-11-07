---
error: "error[E0425]: cannot find value `x` in this scope"
error_full: |
  error[E0425]: cannot find value `total` in this scope
   --> src/main.rs:7:20
    |
  7 |     println!("{}", total);
    |                    ^^^^^ not found in this scope
cat: rust
description: "You used a variable, constant or function name that doesn't exist where you used it: it is out of scope (declared inside a block), misspelled, not imported, or `self` is missing in a method."
tldr: "Declare the variable in the scope where you use it (e.g. before the `if`/loop and assign inside), fix the spelling, add `self.` for struct fields inside methods, or import the item with `use crate::module::NAME;` (and make it `pub`). Run `cargo check` and follow the `help: a local variable with a similar name exists` hints."
keywords: rust e0425 cannot find value in this scope cannot find function not found in this scope variable out of scope self field use import pub typo
related: [rust-e0599-no-method-named-found, rust-e0308-mismatched-types, rust-borrow-of-moved-value]
---
## What it means

Rust resolves every name at compile time. E0425 is reported for values and functions (`cannot find value`, `cannot find function`); types get E0412 and modules/crates E0433. The name is simply not visible at that point.

## Cause 1: variable declared inside a block

`let` bindings live until the end of the enclosing `{}` block:

```rust
fn main() {
    let items = vec![1, 2, 3];
    for x in &items {
        let total = x * 2;
    }
    println!("{}", total);   // E0425
}
```

Fix: declare it in the outer scope:

```rust
let mut total = 0;
for x in &items {
    total += x * 2;
}
println!("{}", total);
```

For values set in an `if`, use the fact that `if` is an expression:

```rust
let label = if n > 0 { "positive" } else { "non-positive" };
```

## Cause 2: struct field used without `self`

Rust has no implicit `this`:

```rust
struct Counter { count: u32 }

impl Counter {
    fn inc(&mut self) {
        count += 1;          // E0425
        self.count += 1;     // correct
    }
}
```

If the method has no `self` parameter (an associated function), you can't access fields at all; add `&self` or `&mut self`.

## Cause 3: function or constant in another module

```rust
mod util {
    pub fn helper() {}
    pub const MAX: usize = 10;
}

fn main() {
    helper();            // E0425
    util::helper();      // ok
}
```

Or import it: `use crate::util::{helper, MAX};`. Items are private by default, so add `pub` (a private item gives E0603 instead). For a file `src/util.rs`, declare `mod util;` in `main.rs` or `lib.rs`.

From a binary using its own library crate, refer to it by the package name: `use my_crate::helper;`.

## Cause 4: typo or case

`cargo check` usually adds a hint like ``help: a local variable with a similar name exists: `totals` ``. Remember Rust is case-sensitive and constants are `SCREAMING_CASE`.

## Cause 5: variable used inside a closure or thread before it exists

Moving the `let` after the closure that uses it, or referring to a variable defined in another function, gives E0425. Closures can only capture variables that are already declared in an enclosing scope.

## Cause 6: macros and `cfg`

- A variable declared inside a macro body is hygienic: `macro_rules!` locals aren't visible to the caller unless the identifier is passed in as a macro argument.
- Code behind `#[cfg(feature = "x")]` or `#[cfg(test)]` is removed when the condition is false, so names defined there vanish. Enable the feature (`cargo build --features x`) or move the definition outside the `cfg`.

## Cause 7: function defined inside another function

Nested `fn` items are only visible in the enclosing function. Move helpers to module level if several functions need them.
