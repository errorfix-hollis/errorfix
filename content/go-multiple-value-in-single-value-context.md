---
error: "multiple-value in single-value context"
error_full: |
  ./main.go:9:7: multiple-value strconv.Atoi(s) (value of type (int, error)) in single-value context
  ./main.go:14:14: assignment mismatch: 1 variable but os.Open returns 2 values
cat: go
description: "You used a function that returns several values (typically a result and an `error`) where Go expects exactly one value: in an expression, a function argument, or an assignment with too few variables."
tldr: "Assign every return value and handle the error: `n, err := strconv.Atoi(s); if err != nil { return err }`. Discard one explicitly with `_` only if you're sure: `n, _ := strconv.Atoi(s)`. To use it inline, write a small helper or `must` wrapper."
keywords: golang multiple-value in single-value context assignment mismatch 1 variable but returns 2 values strconv.atoi os.open error handling blank identifier go compile error
related: [go-declared-and-not-used, go-cannot-use-as-value-in-assignment, go-invalid-memory-address-or-nil-pointer-dereference]
---
## What it means

Go functions can return multiple values, and the idiom is `(result, error)`. Unlike some languages, Go never silently drops extra return values — a multi-value call can only appear where all its values are received. Using it as a single value is a compile error.

Older Go versions print `multiple-value f() in single-value context`; newer ones add the types: `multiple-value strconv.Atoi(s) (value of type (int, error)) in single-value context`. The assignment form reports `assignment mismatch: 1 variable but f returns 2 values`.

## Cause 1: assigning to one variable

```go
n := strconv.Atoi("42")          // assignment mismatch
```

**Fix:** receive both and check the error:

```go
n, err := strconv.Atoi("42")
if err != nil {
    return fmt.Errorf("parse count: %w", err)
}
```

If the error genuinely can't matter, discard it with the blank identifier — but be aware you'll get the zero value on failure:

```go
n, _ := strconv.Atoi("42")
```

## Cause 2: calling inside an expression or argument

```go
total := strconv.Atoi(a) + 1               // error
fmt.Println(json.Marshal(v))               // fine: Println is variadic ...any
s := string(json.Marshal(v))               // error
```

Split it into a statement first:

```go
b, err := json.Marshal(v)
if err != nil { return err }
s := string(b)
```

There's one special case: `f(g())` is allowed when `g`'s return values exactly match `f`'s parameters — that's why `fmt.Println(json.Marshal(v))` compiles (it prints both values). Mixing it with other arguments (`f(x, g())`) is not allowed.

## Cause 3: map lookup, type assertion, channel receive

These have optional second values (`ok`), and can be used as single values — they're not the cause. But functions *returning* them are. E.g. a helper `func get(k string) (string, bool)` must be called as `v, ok := get(k)`.

## Cause 4: struct field or return statement

```go
cfg := Config{Port: strconv.Atoi(os.Getenv("PORT"))}   // error

func load() int {
    return strconv.Atoi(s)    // error: too many return values
}
```

Fix both by unpacking first and returning the error to the caller:

```go
func load() (int, error) {
    return strconv.Atoi(s)    // ok: same signature (int, error)
}
```

## A must() helper for initialisation

For values that must succeed at program start (templates, regexes, embedded config), panicking on error is reasonable. Many packages provide `Must` variants (`regexp.MustCompile`, `template.Must`). With generics (Go 1.18+) you can write your own:

```go
func must[T any](v T, err error) T {
    if err != nil {
        panic(err)
    }
    return v
}

var port = must(strconv.Atoi(os.Getenv("PORT")))
```

Don't use it for errors that can happen at runtime from user input — handle those.

## Related compile errors

- `declared and not used: err` — you received `err` but never checked it. Add `if err != nil`.
- `no new variables on left side of :=` — reuse with `=` when both variables already exist.
