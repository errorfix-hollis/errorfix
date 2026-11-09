---
error: "error[E0515]: cannot return reference to local variable"
error_full: |
  error[E0515]: cannot return reference to local variable `s`
   --> src/main.rs:3:5
    |
  3 |     &s
    |     ^^ returns a reference to data owned by the current function
cat: rust
description: "A function tries to return a reference to a value it created. That value is dropped when the function returns, so the reference would dangle. Return the owned value instead."
tldr: "Return the owned type instead of a reference: `fn f() -> String { s }` instead of `-> &str { &s }` (likewise `Vec<T>` instead of `&[T]`). If the data comes from a parameter, return a reference tied to that parameter's lifetime. Use `Cow` when you sometimes borrow and sometimes allocate."
keywords: rust e0515 cannot return reference to local variable returns a reference to data owned by the current function cannot return value referencing temporary value dangling reference lifetime String &str
related: [rust-e0106-missing-lifetime-specifier, rust-borrow-of-moved-value, rust-cannot-borrow-as-mutable]
---
## What it means

Local variables live on the function's stack frame and are dropped at the end of the function. A reference returned from the function would point at freed memory, so the borrow checker rejects it. Variants of the same error:

- ``cannot return reference to local variable `x` ``
- ``cannot return value referencing local variable `x` ``
- `cannot return value referencing temporary value`
- ``cannot return reference to function parameter `x` `` (a parameter taken **by value** is also local)

No lifetime annotation can fix this — `'static` or `'a` on the return type just produces a different error. You need to change *who owns* the data.

## Fix 1: return the owned value

```rust
// Wrong
fn greeting(name: &str) -> &str {
    let s = format!("Hello, {name}");
    &s
}

// Right
fn greeting(name: &str) -> String {
    format!("Hello, {name}")
}
```

The same for collections: return `Vec<T>` instead of `&[T]`, `PathBuf` instead of `&Path`, `HashMap` instead of a reference to one. Moving a `String`/`Vec` out of a function is cheap — it copies three words, not the contents.

## Fix 2: borrow from an input instead

If the result is a slice of something the caller owns, take that by reference so the output can borrow from it:

```rust
fn first_word(text: &str) -> &str {
    text.split_whitespace().next().unwrap_or("")
}
```

Lifetime elision ties the output to `text`. With multiple reference parameters you must annotate which one: `fn pick<'a>(a: &'a str, b: &str) -> &'a str`.

## Fix 3: methods on temporaries

A common hidden case:

```rust
fn upper_name(user: &User) -> &str {
    user.name.to_uppercase().as_str()   // E0515: temporary String
}
```

`to_uppercase()` creates a new `String` that dies at the end of the statement. Return `String`:

```rust
fn upper_name(user: &User) -> String {
    user.name.to_uppercase()
}
```

Same with `.to_string().as_str()`, `.collect::<Vec<_>>().as_slice()`, `path.to_string_lossy()` (returns `Cow`), and `lock().unwrap().field` returning `&` through a `MutexGuard`.

## Fix 4: sometimes borrowed, sometimes owned — use Cow

```rust
use std::borrow::Cow;

fn normalize(input: &str) -> Cow<'_, str> {
    if input.contains(' ') {
        Cow::Owned(input.replace(' ', "_"))
    } else {
        Cow::Borrowed(input)
    }
}
```

The caller can use it like a `&str` and call `.into_owned()` if it needs a `String`.

## Fix 5: iterators over local data

```rust
fn evens() -> impl Iterator<Item = &u32> {   // E0515
    let v = vec![1, 2, 3, 4];
    v.iter().filter(|x| *x % 2 == 0)
}
```

Use `into_iter()` so the iterator owns the data:

```rust
fn evens() -> impl Iterator<Item = u32> {
    let v = vec![1, 2, 3, 4];
    v.into_iter().filter(|x| x % 2 == 0)
}
```

## What not to do

`Box::leak` or `static mut` make the error go away by never freeing memory. That's acceptable for genuine once-per-program data (e.g. config loaded at startup) but not as a general fix. If many owners need the same data, use `Rc<T>`/`Arc<T>` and return a clone of the pointer.
