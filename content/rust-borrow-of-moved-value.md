---
error: "error[E0382]: borrow of moved value"
error_full: |
  error[E0382]: borrow of moved value: `name`
   --> src/main.rs:5:20
    |
  2 |     let name = String::from("ann");
    |         ---- move occurs because `name` has type `String`, which does not implement the `Copy` trait
  3 |     let user = User { name };
    |                       ---- value moved here
  4 |
  5 |     println!("{}", name);
    |                    ^^^^ value borrowed here after move
cat: rust
description: You used a value after ownership moved somewhere else. Borrow it with & instead of moving it, clone it, or reorder the code.
tldr: "Pass a reference (`&name`) if the receiver doesn't need ownership, call `.clone()` if both places need their own copy, or use the value before it's moved."
keywords: rust e0382 borrow of moved value use of moved value move occurs because does not implement the copy trait clone reference
related: [rust-cannot-borrow-as-mutable]
---
## What it means

In Rust, assigning a non-`Copy` value (like `String`, `Vec`, or most structs), passing it to a function, or putting it in a struct **moves** it. The old variable can no longer be used. The compiler shows exactly where the move happened ("value moved here").

## Fix 1: borrow instead of moving

If the function only needs to read the value, take a reference:

```rust
fn greet(name: &str) { println!("hi {name}"); }

let name = String::from("ann");
greet(&name);
println!("{name}");   // still usable
```

## Fix 2: clone

When both places really need their own copy:

```rust
let user = User { name: name.clone() };
println!("{name}");
```

Cloning is fine for small values; for big data or hot loops, prefer references or `Rc`/`Arc`.

## Fix 3: use it before the move

```rust
println!("{name}");
let user = User { name };
```

## In loops

```rust
for item in items { ... }      // moves `items`
for item in &items { ... }     // borrows; items is still usable afterwards
for item in &mut items { ... } // mutable borrow
```

## In closures and threads

`move` closures take ownership of captured variables. Clone before the closure if you need the value afterwards, or share it with `Arc`:

```rust
let data = Arc::new(data);
let d = Arc::clone(&data);
thread::spawn(move || use_data(&d));
```

## Make small types Copy

Plain structs made only of `Copy` fields (numbers, `bool`, `char`) can derive it, and then they're copied instead of moved:

```rust
#[derive(Clone, Copy)]
struct Point { x: f64, y: f64 }
```
