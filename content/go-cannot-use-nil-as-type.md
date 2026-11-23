---
error: "cannot use nil as string value in assignment"
error_full: |
  ./main.go:8:9: cannot use nil as string value in assignment
  ./main.go:14:10: cannot use nil as int value in return statement
  ./main.go:20:15: cannot use nil as type MyStruct in argument to process
cat: go
description: "In Go, `nil` is only a valid value for pointers, slices, maps, channels, functions and interfaces. Basic types (`string`, `int`, `bool`) and structs have zero values instead and can never be nil."
tldr: "Use the type's zero value (`\"\"`, `0`, `false`, `MyStruct{}`), or change the type to something nillable: a pointer (`*string`, `*MyStruct`) for an optional value, or return `(T, error)` / `(T, bool)` to signal \"no result\". For JSON/SQL nullable fields use `*string` or `sql.NullString`."
keywords: go cannot use nil as string value in assignment int value in return statement type in argument nil zero value pointer optional sql.NullString golang untyped nil struct
related: [go-invalid-memory-address-or-nil-pointer-dereference, go-cannot-use-as-value-in-assignment, go-multiple-value-in-single-value-context]
---
## What it means

`nil` is the zero value for pointer, slice, map, channel, func and interface types only. Every other type has its own zero value:

| Type | Zero value |
|---|---|
| `string` | `""` |
| `int`, `float64`, ... | `0` |
| `bool` | `false` |
| struct `T` | `T{}` (all fields zero) |
| array `[3]int` | `[3]int{}` |

Assigning, returning or passing `nil` where one of those is expected is a compile error. Older Go versions (before 1.20) word it `cannot use nil as type string in assignment`.

## Cause 1: returning nil for "not found"

```go
func findName(id int) string {
    if id == 0 {
        return nil   // error
    }
    return "alice"
}
```

Idiomatic Go returns a second value:

```go
func findName(id int) (string, bool) {
    if id == 0 {
        return "", false
    }
    return "alice", true
}

if name, ok := findName(id); ok { ... }
```

or an error:

```go
var ErrNotFound = errors.New("not found")

func findUser(id int) (User, error) {
    if id == 0 {
        return User{}, ErrNotFound
    }
    return User{ID: id}, nil   // nil is fine here: error is an interface
}
```

## Cause 2: returning nil for a struct

```go
func load() (Config, error) {
    return nil, err      // cannot use nil as Config value in return statement
}
```

Return the zero struct, or switch to a pointer if callers should check for "no value":

```go
func load() (Config, error)  { return Config{}, err }
func load() (*Config, error) { return nil, err }
```

## Cause 3: optional values (JSON, config, SQL)

A plain `string` can't distinguish "empty" from "missing". Use a pointer:

```go
type Update struct {
    Name  *string `json:"name,omitempty"`
    Age   *int    `json:"age,omitempty"`
}

name := "bob"
u := Update{Name: &name}   // Age stays nil
```

For database columns that can be `NULL`, scanning into a plain `string` fails at runtime; use `sql.NullString` / `sql.NullInt64` (or `sql.Null[T]` in Go 1.22+):

```go
var email sql.NullString
err := row.Scan(&email)
if email.Valid { fmt.Println(email.String) }
```

Remember to check pointers before dereferencing, or you'll get [invalid memory address or nil pointer dereference](/go/go-invalid-memory-address-or-nil-pointer-dereference/).

## Cause 4: resetting a variable

```go
var count int = 5
count = nil      // error
count = 0        // reset to zero value
```

## Cause 5: generics

In a generic function, `nil` isn't valid for an arbitrary `T`. Use the zero value of the type parameter:

```go
func First[T any](xs []T) (T, bool) {
    var zero T
    if len(xs) == 0 {
        return zero, false
    }
    return xs[0], true
}
```

## Comparing with nil

The same rule gives `invalid operation: s == nil (mismatched types string and untyped nil)`. Compare with the zero value instead: `if s == "" { ... }`.
