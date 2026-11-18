---
error: "panic: runtime error: slice bounds out of range"
error_full: |
  panic: runtime error: slice bounds out of range [:5] with capacity 3

  goroutine 1 [running]:
  main.main()
      /home/me/app/main.go:9 +0x1d
  exit status 2
cat: go
description: "A slice expression s[low:high] used a bound larger than the slice's capacity, or low greater than high. Check lengths before slicing, or clamp the bounds."
tldr: "Guard the slice: `if len(s) >= n { s = s[:n] }` or clamp with `s[:min(n, len(s))]` (Go 1.21+). For `[a:b]` with `a > b` errors, make sure start <= end. The message tells you the offending bound and the capacity/length; the stack trace gives the line."
keywords: go panic runtime error slice bounds out of range with capacity with length [:n] slice expression substring string index golang min len check
related: [go-panic-runtime-error-index-out-of-range, go-invalid-memory-address-or-nil-pointer-dereference, go-panic-assignment-to-entry-in-nil-map]
---
## What it means

A slice expression `s[low:high]` (or `s[low:high:max]`) requires `0 <= low <= high <= cap(s)`. For strings and when slicing with a low bound only (`s[low:]`), the limit is `len(s)`. Breaking that rule panics at runtime. The message says which rule:

- `slice bounds out of range [:5] with capacity 3` – high bound 5 > cap 3
- `slice bounds out of range [:5] with length 3` – high bound > len (strings, or arrays)
- `slice bounds out of range [4:] with length 3` – low bound > len
- `slice bounds out of range [3:2]` – low > high

The stack trace's first line in your code (here `main.go:9`) is the expression.

## Cause 1: assuming input is long enough

```go
name := "Go"
short := name[:5]          // panic: [:5] with length 2
```

Clamp to the length:

```go
short := name[:min(5, len(name))]   // Go 1.21+ built-in min
```

Before Go 1.21:

```go
n := 5
if len(name) < n {
    n = len(name)
}
short := name[:n]
```

Note that string slicing is by **bytes**, not characters. To truncate to 5 characters safely with non-ASCII text, convert to runes: `r := []rune(name); r = r[:min(5, len(r))]; short := string(r)`.

## Cause 2: computed bounds from strings.Index

`strings.Index` returns `-1` when not found, which produces a negative or inverted range:

```go
line := "key=value"
i := strings.Index(line, ":")     // -1
val := line[i+1:]                 // works by accident ([0:])
key := line[:i]                   // panic: [:-1]
```

Check the result, or use `strings.Cut` (Go 1.18+), which can't panic:

```go
key, val, found := strings.Cut(line, "=")
if !found {
    return fmt.Errorf("bad line %q", line)
}
```

## Cause 3: start greater than end

```go
s[start:end]   // panic: slice bounds out of range [7:4]
```

Usually off-by-one logic or swapped arguments in pagination:

```go
start := page * size
if start > len(items) {
    start = len(items)
}
end := min(start+size, len(items))
pageItems := items[start:end]
```

## Cause 4: reading n bytes from a buffer

`Read` returns how many bytes it actually read. Slice by that, not by the buffer size or what you expected:

```go
buf := make([]byte, 1024)
n, err := r.Read(buf)
data := buf[:n]          // not buf[:1024] or buf[:expected]
```

When parsing binary data, check `len(b) >= needed` before `b[off:off+4]`; malformed input should return an error, not panic. Or use `io.ReadFull`.

## Cause 5: slicing past capacity after append

`s[:cap(s)]` is fine, but larger values panic even if you plan to append. Use `append` to grow, or `make([]T, n)` to get the length you need, or `slices.Grow(s, n)` (Go 1.21+).

## Cause 6: concurrent modification

If one goroutine shrinks a slice while another slices it, bounds checked earlier can be stale. Protect shared slices with a `sync.Mutex`, and run tests with `go test -race`.

## Debugging

Print the values just before the expression:

```go
log.Printf("len=%d cap=%d start=%d end=%d", len(s), cap(s), start, end)
```

For panics in production, `recover()` in a deferred function can turn the panic into an error at a request boundary, but fix the bounds check rather than relying on it.
