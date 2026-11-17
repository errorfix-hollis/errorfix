---
error: "panic: runtime error: index out of range [5] with length 5"
error_full: |
  panic: runtime error: index out of range [5] with length 5

  goroutine 1 [running]:
  main.main()
  	/home/me/app/main.go:9 +0x1d
  exit status 2
cat: go
description: "You indexed a slice, array or string at a position that doesn't exist. Valid indexes are 0 to len-1; Go checks bounds at runtime and panics instead of reading past the end."
tldr: "Look at the file:line in the goroutine trace and check the index against `len()`: use `i < len(s)` (not `<=`) in loops, check `len(s) > 0` before `s[0]`, and check `len(os.Args)` before reading arguments. For slicing errors (`slice bounds out of range`), make sure `low <= high <= cap(s)`."
keywords: go golang panic runtime error index out of range with length slice bounds out of range len cap os.Args off by one goroutine
related: [go-invalid-memory-address-or-nil-pointer-dereference, go-panic-assignment-to-entry-in-nil-map, go-all-goroutines-are-asleep-deadlock]
---
## What it means

Go slices, arrays and strings are bounds-checked. Accessing `s[i]` with `i < 0` or `i >= len(s)` panics. The message tells you both numbers: `index out of range [5] with length 5` means you used index 5 on a 5-element slice (valid: 0-4). `with length 0` means the slice was empty.

The first `main.go:LINE` in the stack trace below the panic is where it happened.

Related messages from the same check:

- `slice bounds out of range [:7] with capacity 5` - slicing `s[low:high]` past `cap`.
- `slice bounds out of range [3:2]` - `low > high`.

## Cause 1: off-by-one in a loop

```go
for i := 0; i <= len(items); i++ {   // <= goes one past the end
    fmt.Println(items[i])
}
```

## Fix 1: use `<` or `range`

```go
for i := 0; i < len(items); i++ { ... }

for i, item := range items {          // can't go out of range
    fmt.Println(i, item)
}
```

## Cause 2: empty slice

```go
users := fetchUsers()      // returned nothing
first := users[0]          // index out of range [0] with length 0
```

## Fix 2: check the length first

```go
if len(users) == 0 {
    return errors.New("no users")
}
first := users[0]
```

## Cause 3: command-line arguments

`os.Args[0]` is the program name; the first argument is `os.Args[1]`. Running without arguments panics:

```go
name := os.Args[1]   // index out of range [1] with length 1
```

```go
if len(os.Args) < 2 {
    fmt.Fprintln(os.Stderr, "usage: app <name>")
    os.Exit(1)
}
name := os.Args[1]
```

The `flag` package handles this more robustly (`flag.Arg(0)` returns `""` when missing).

## Cause 4: `make` with length vs capacity

```go
s := make([]int, 0, 10)   // length 0, capacity 10
s[0] = 1                  // panic: index out of range [0] with length 0
```

Capacity is not length. Either `append`, or create the length you need:

```go
s = append(s, 1)
// or
s := make([]int, 10)
s[0] = 1
```

## Cause 5: splitting strings

```go
parts := strings.Split(line, "=")
key, value := parts[0], parts[1]   // panics when the line has no "="
```

```go
key, value, ok := strings.Cut(line, "=")
if !ok { /* handle bad line */ }
```

## Cause 6: indexing strings by character

`s[i]` indexes **bytes**, and `len(s)` counts bytes. With non-ASCII text, convert to runes first:

```go
r := []rune(s)
if len(r) > 3 {
    fmt.Println(string(r[3]))
}
```

## Cause 7: concurrent modification

If one goroutine shrinks a slice while another indexes it, you get intermittent panics. Run tests with `go test -race` and protect shared slices with a `sync.Mutex`.

## Recovering instead of crashing

For servers, `net/http` already recovers panics per request. Elsewhere you can `defer func() { if r := recover(); r != nil { ... } }()`, but fix the bounds check - recovering hides the bug.
