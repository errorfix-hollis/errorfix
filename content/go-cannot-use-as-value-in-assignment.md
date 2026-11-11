---
error: "cannot use x (variable of type T) as U value in assignment"
error_full: |
  ./main.go:14:9: cannot use n (variable of type int) as string value in assignment
  ./main.go:20:12: cannot use cfg (variable of type Config) as *Config value in argument to Load
  ./main.go:25:15: cannot use s (variable of type *MyStore) as Store value in variable declaration: *MyStore does not implement Store (missing method Close)
cat: go
description: "Go found a value of one type where a different type is required (assignment, function argument, return value or struct field). Go never converts types implicitly, so even int vs int64 or T vs *T is a compile error."
tldr: "Convert explicitly where a conversion exists (`int64(n)`, `float64(n)`, `strconv.Itoa(n)` for int to string), pass a pointer with `&cfg` or dereference with `*p`, and for interfaces implement the missing method listed after `does not implement` (check pointer vs value receivers)."
keywords: go golang cannot use as value in assignment argument variable of type does not implement missing method pointer receiver type conversion strconv itoa int64 interface
related: [go-undefined, go-declared-and-not-used, go-invalid-memory-address-or-nil-pointer-dereference]
---
## What it means

Go is strictly typed and has no implicit conversions. `cannot use X (variable of type A) as B value in <context>` means the compiler expected type `B` but got `A`. The context tells you where: `in assignment`, `in argument to F`, `in return statement`, `in struct literal`, `in variable declaration`. Older Go versions phrase it as `cannot use x (type A) as type B`.

## Cause 1: numeric types differ

`int`, `int32`, `int64`, `float64` and `uint` are all distinct:

```go
var total int64
n := 5            // int
total = n         // cannot use n (variable of type int) as int64 value
total = int64(n)  // OK
```

Same for `time.Duration`, which is an `int64` type:

```go
secs := 5
time.Sleep(secs * time.Second)                 // error: int * Duration
time.Sleep(time.Duration(secs) * time.Second)  // OK
```

Untyped constants (`time.Sleep(5 * time.Second)`) work because constants adapt to the needed type.

## Cause 2: int to string

`string(n)` compiles but returns the Unicode character with code `n` (`string(65)` is `"A"`), and `go vet` flags it. Use `strconv`:

```go
s := strconv.Itoa(n)           // int -> string
n, err := strconv.Atoi(s)      // string -> int
s := fmt.Sprintf("%d items", n)
```

`[]byte` and `string` do convert directly: `string(b)`, `[]byte(s)`.

## Cause 3: value vs pointer

```go
func Load(c *Config) error { ... }

cfg := Config{}
Load(cfg)    // cannot use cfg (variable of type Config) as *Config value
Load(&cfg)   // OK
```

The reverse (`*Config` given, `Config` wanted): dereference with `*p`, after making sure it isn't nil.

## Cause 4: type does not implement an interface

The extended message says what's missing:

```
*MyStore does not implement Store (missing method Close)
MyStore does not implement Store (method Close has pointer receiver)
```

For the first, add the method with the exact signature the interface declares. For the second, methods defined on `*MyStore` belong only to the pointer type, so pass a pointer:

```go
func (s *MyStore) Close() error { return nil }

var st Store = MyStore{}   // error: method Close has pointer receiver
var st Store = &MyStore{}  // OK
```

`wrong type for method X` means the signature differs (e.g. returns `error` vs nothing, or `ctx context.Context` parameter missing).

## Cause 5: named types and slices

A named type is distinct from its underlying type when both are named, and slices don't convert element-wise:

```go
type UserID int64
var id UserID = UserID(raw)      // conversion needed from int64 variable

var ids []int
var anys []any = ids              // error: []int is not []any
anys := make([]any, len(ids))
for i, v := range ids { anys[i] = v }
```

## Cause 6: interface value used as a concrete type

Values from `any`/`interface{}` (e.g. decoded JSON, `context.Value`) need a type assertion:

```go
v := m["count"]          // any
n := v.(float64)         // panics if wrong; JSON numbers decode as float64
n, ok := v.(float64)     // safe form
```

## Cause 7: same name, different package

`cannot use x (variable of type "example.com/a/v1".User) as "example.com/a/v2".User` means two versions of a module are in the build. Align imports so every file uses the same module path and run `go mod tidy`.
