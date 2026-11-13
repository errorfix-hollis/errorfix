---
error: "error[E0616]: field `x` of struct `Y` is private"
error_full: |
  error[E0616]: field `balance` of struct `Account` is private
    --> src/main.rs:5:24
     |
  5 |     println!("{}", acct.balance);
     |                         ^^^^^^^ private field
cat: rust
description: "Struct fields are private to the module that defines the struct by default. Code in another module (or crate) tried to read or write a field that isn't marked pub."
tldr: "Either make the field public (`pub balance: u64`, or `pub(crate)` for the same crate only) or, better, add a getter in the defining module: `pub fn balance(&self) -> u64 { self.balance }`. For external crates, use the provided methods; if the compiler suggests a method with the same name, call it with `()`."
keywords: rust e0616 field is private struct field pub pub(crate) getter method module privacy visibility private field external crate
related: [rust-e0603-struct-is-private, rust-e0599-no-method-named-found, rust-e0433-failed-to-resolve]
---
## What it means

In Rust, visibility is per *module*, and every item — including each struct field — is private unless marked `pub`. A field is visible in the module where the struct is defined and in that module's child modules, but nowhere else. Making the struct `pub` does **not** make its fields public.

```rust
mod bank {
    pub struct Account {
        balance: u64,          // private
    }
    impl Account {
        pub fn new() -> Self { Account { balance: 0 } }
    }
}

fn main() {
    let acct = bank::Account::new();
    println!("{}", acct.balance);   // E0616
}
```

## Fix 1: add an accessor method (usually best)

Keep the field private and expose what callers need:

```rust
impl Account {
    pub fn balance(&self) -> u64 {
        self.balance
    }
    pub fn deposit(&mut self, amount: u64) {
        self.balance += amount;
    }
}

println!("{}", acct.balance());
```

This lets you keep invariants (e.g. balance can't be set arbitrarily) and change the internal representation later. Return `&T` for non-`Copy` fields: `pub fn name(&self) -> &str { &self.name }`.

## Fix 2: make the field public

If the struct is plain data with no invariants:

```rust
pub struct Point {
    pub x: f64,
    pub y: f64,
}
```

Narrower options:

```rust
pub(crate) balance: u64,        // visible anywhere in this crate
pub(super) balance: u64,        // visible in the parent module
pub(in crate::bank) balance: u64,
```

Note that if *any* field stays private, code outside the module can't construct the struct with a literal (`Account { balance: 0 }`) — that gives `E0451`. Provide a constructor like `new()`.

## Fix 3: it's a field on a struct from another crate

You can't change visibility of a dependency's fields. Look for methods in the crate's docs (`cargo doc --open`). Often the compiler hints:

```text
help: a method `len` also exists, call it with parentheses: `len()`
```

So `v.len` → `v.len()`, `s.status` → `s.status()`. Tuple-struct newtypes like `struct Meters(f64)` with a private `.0` usually offer `into_inner()`, `as_ref()`, `Deref` or a getter.

## Fix 4: the code is in the wrong module

Moving the struct into a separate file (`mod models;`) makes everything in `main.rs` "outside" the module. Either add `pub` / getters as above, or put the code that needs raw field access inside the module (an `impl` block in `models.rs`).

Child modules can see private fields of a parent, which is why a `mod tests` declared inside the defining module (e.g. at the bottom of `bank.rs`) can read private fields:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn starts_empty() {
        assert_eq!(Account::new().balance, 0); // allowed: child module
    }
}
```

Integration tests in `tests/` are a separate crate and only see `pub` items.

## Related

- [E0603: struct is private](/rust/rust-e0603-struct-is-private/) — the type itself (not a field) isn't `pub` or isn't re-exported.
- `E0624: method is private` — same rule for methods: add `pub fn`.
