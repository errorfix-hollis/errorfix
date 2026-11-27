---
error: "error[E0507]: cannot move out of which is behind a shared reference"
error_full: |
  error[E0507]: cannot move out of `self.name` which is behind a shared reference
   --> src/main.rs:8:9
    |
  8 |         self.name
    |         ^^^^^^^^^ move occurs because `self.name` has type `String`, which does not implement the `Copy` trait
cat: rust
description: "You tried to take ownership of a value (a String, Vec, Box...) that you only have a reference to. Moving it would leave the owner with a hole, so the borrow checker refuses."
tldr: "Don't move: return or use a reference (`&self.name`, `.as_ref()`, `.iter()`), clone it (`self.name.clone()`), or take it out and leave something in its place (`std::mem::take(&mut self.name)`, `option.take()`). For `Option` fields use `.as_ref()` / `.as_deref()` before `.unwrap()` or `match`."
keywords: rust e0507 cannot move out of which is behind a shared reference mutable reference borrowed content does not implement the copy trait clone as_ref mem take option unwrap
related: [rust-borrow-of-moved-value, rust-cannot-borrow-as-mutable, rust-e0515-cannot-return-reference-to-local-variable]
---
## What it means

Types like `String`, `Vec<T>`, `Box<T>` are moved, not copied. Moving requires ownership. When you only hold `&T` or `&mut T` (including `&self`, items of `.iter()`, elements behind an index, values behind an `Rc` or `Arc`), moving the value out would leave the real owner holding an invalid value. So E0507 is raised. Older compilers phrased it as `cannot move out of borrowed content`.

## Cause 1: returning a field from a `&self` method

```rust
struct User { name: String }

impl User {
    fn name(&self) -> String {
        self.name            // E0507
    }
}
```

Pick what you actually need:

```rust
fn name(&self) -> &str { &self.name }               // borrow (usually best)
fn name(&self) -> String { self.name.clone() }       // owned copy
fn into_name(self) -> String { self.name }           // consume the struct
```

## Cause 2: unwrap / match on an Option or Result field

```rust
struct Config { path: Option<String> }

fn show(c: &Config) {
    let p = c.path.unwrap();        // E0507: unwrap() takes self by value
}
```

Convert to `Option<&T>` first:

```rust
let p: &str = c.path.as_deref().unwrap_or("default.toml");
if let Some(p) = &c.path { println!("{p}"); }        // match on a reference
let p: &String = c.path.as_ref().unwrap();
```

The same applies to `match self.state { State::A(s) => ... }` — write `match &self.state` so the bindings become references.

## Cause 3: moving out of a Vec by index or while iterating

```rust
let v = vec![String::from("a"), String::from("b")];
let first = v[0];                        // E0507
for s in v.iter() { let owned: String = *s; }   // E0507
```

```rust
let first = &v[0];                       // borrow
let first = v[0].clone();                // copy
let first = v.into_iter().next();        // consume the Vec
for s in v { /* s: String, owned */ }    // iterate by value
let owned: Vec<String> = v.iter().cloned().collect();
```

`v.swap_remove(0)` or `v.remove(0)` take an element out when you have `&mut Vec`.

## Cause 4: taking a field out through `&mut self`

Even with a mutable reference you can't leave a field empty. Replace it with something valid:

```rust
use std::mem;

fn flush(&mut self) -> Vec<Event> {
    mem::take(&mut self.buffer)                 // leaves Vec::new()
}

fn finish(&mut self) -> Option<Handle> {
    self.handle.take()                           // Option: leaves None
}

let old = mem::replace(&mut self.state, State::Idle);
```

`mem::take` requires `Default`; `mem::replace` works with any value.

## Cause 5: values inside Rc, Arc or a closure capture

`*rc` gives a reference, so `let x = *rc;` fails for non-`Copy` types. Clone the inner value (`(*rc).clone()`), or use `Rc::try_unwrap(rc)` / `Arc::try_unwrap(arc)` when you hold the last reference. In closures that must be `Fn`/`FnMut`, clone the captured value inside the closure instead of moving it out.

## Cause 6: dereferencing `&` in a pattern

```rust
for &s in names.iter() {}            // E0507 for Vec<String>
for s in names.iter() {}             // s: &String
```

`&` patterns only work for `Copy` types such as `&i32`.
