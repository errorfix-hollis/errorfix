---
error: "invalid operation: mismatched types int and time.Duration"
error_full: |
  ./main.go:10:24: invalid operation: n * time.Second (mismatched types int and time.Duration)
  ./main.go:14:9: invalid operation: a + b (mismatched types int and int64)
  ./main.go:18:12: invalid operation: total / count (mismatched types float64 and int)
cat: go
description: "Go never converts between numeric types implicitly. Both operands of +, -, *, / and comparisons must have the same type, so int * time.Duration or int + int64 is a compile error until you convert one side."
tldr: "Convert explicitly: `time.Duration(n) * time.Second`, `int64(a) + b`, `total / float64(count)`. Untyped constants convert automatically (`5 * time.Second` works), variables don't. Declare variables with the type you need to avoid repeated conversions."
keywords: go golang invalid operation mismatched types int and time.duration int64 float64 int32 uint conversion time.second multiply duration compile error
related: [go-cannot-use-as-value-in-assignment, go-undefined, go-declared-and-not-used]
---
## What it means

In Go, `int`, `int64`, `float64`, `time.Duration` and every other named numeric type are **distinct types**. Binary operators require both sides to have identical types, and Go never inserts conversions for you. So:

```go
n := 5
time.Sleep(n * time.Second)   // mismatched types int and time.Duration
```

But this compiles:

```go
time.Sleep(5 * time.Second)
```

because `5` is an **untyped constant**, which takes on the type of the other operand. `n` is a variable of type `int`, so no automatic conversion happens.

## Fix 1: `int` and `time.Duration`

`time.Duration` is an `int64` count of nanoseconds. Convert the number, then multiply by the unit:

```go
timeout := time.Duration(n) * time.Second
time.Sleep(time.Duration(ms) * time.Millisecond)
```

Don't write `time.Duration(n * time.Second)`; that's the same mismatched expression. And don't convert `n` alone and pass it (`time.Duration(5)` is 5 *nanoseconds*).

Going the other way, use the Duration methods:

```go
secs := d.Seconds()          // float64
ms := d.Milliseconds()       // int64
n := int(d / time.Second)    // whole seconds as int
```

For config values, parse durations directly instead of multiplying:

```go
d, err := time.ParseDuration("1m30s")
```

## Fix 2: different integer sizes

```go
var a int = 10
var b int64 = 20
sum := int64(a) + b        // or a + int(b)
```

Prefer converting the smaller type to the larger to avoid overflow. Converting `int64` → `int32` silently truncates. `len()` returns `int`, so comparisons with `int64`/`uint` counters need a conversion too:

```go
if int64(len(buf)) > maxSize { ... }
```

## Fix 3: integer and float

```go
avg := total / float64(count)     // total is float64, count is int
pct := float64(done) / float64(all) * 100
```

`int(f)` truncates toward zero; use `math.Round(f)` first if you want rounding.

## Fix 4: named types you defined

```go
type Celsius float64
var t Celsius = 20
var delta float64 = 1.5
t + delta              // mismatched types Celsius and float64
t + Celsius(delta)     // OK
```

## Fix 5: generics

In a generic function, operands must share the *type parameter*, not just a constraint:

```go
func Sum[T int | float64](xs []T) T {
    var s T
    for _, x := range xs { s += x }
    return s
}
```

Mixing `T` with a concrete `int` (e.g. `s / len(xs)`) fails; convert with `T(len(xs))`.

## Avoid the conversions

Declare values with the right type at the source, e.g. store timeouts as `time.Duration` in your config struct, and use `int64` consistently for IDs coming from databases.

```go
type Config struct {
    Timeout time.Duration
}
```

Note that `encoding/json` decodes a `time.Duration` from a plain number of **nanoseconds**; if your config says `"30s"`, read it as a string and call `time.ParseDuration`.
