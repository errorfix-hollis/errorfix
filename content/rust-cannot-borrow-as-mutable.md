---
error: "error[E0502]: cannot borrow as mutable because it is also borrowed as immutable"
error_full: |
  error[E0502]: cannot borrow `v` as mutable because it is also borrowed as immutable
   --> src/main.rs:4:5
    |
  3 |     let first = &v[0];
    |                  - immutable borrow occurs here
  4 |     v.push(4);
    |     ^^^^^^^^^ mutable borrow occurs here
  5 |     println!("{first}");
    |               ------- immutable borrow later used here
cat: rust
description: You tried to change a value while a reference to it is still in use. Finish using the reference first, copy the data out, or restructure the code.
tldr: "End the immutable borrow before mutating: use `first` before `v.push(4)`, or copy the value out (`let first = v[0];` for Copy types, `.clone()` otherwise)."
keywords: rust e0502 cannot borrow as mutable because it is also borrowed as immutable borrow checker vector push iterate modify
related: [rust-borrow-of-moved-value]
---
## What it means

Rust allows **either** many shared (`&`) references **or** one mutable (`&mut`) reference at a time. Here a shared reference (`first`) is still used later, while you try to mutate `v`. That rule exists for a real reason: `push` may reallocate the vector, which would leave `first` pointing at freed memory.

## Fix 1: use the reference before mutating

```rust
let first = &v[0];
println!("{first}");
v.push(4);              // OK: `first` is no longer used
```

## Fix 2: copy the value out

```rust
let first = v[0];       // i32 is Copy
// or: let first = v[0].clone();
v.push(4);
println!("{first}");
```

## Fix 3: modifying a collection while iterating

```rust
for x in &v {
    if *x > 2 { v.push(*x); }   // E0502
}
```

Collect first, then mutate:

```rust
let extra: Vec<_> = v.iter().filter(|x| **x > 2).copied().collect();
v.extend(extra);
```

To remove items, use `v.retain(|x| ...)`. To modify in place, use `for x in v.iter_mut()`.

## Fix 4: struct methods

Calling `self.helper()` (which borrows all of `self`) while holding a reference to `self.items` triggers this too. Borrow only the fields you need, or pass them as arguments to a free function.

## When the borrow really must be shared

For shared mutable state, use interior mutability: `RefCell` (single thread) or `Mutex`/`RwLock` (threads).
