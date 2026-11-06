---
error: "panic: assignment to entry in nil map"
error_full: |
  panic: assignment to entry in nil map

  goroutine 1 [running]:
  main.main()
  	/home/me/app/main.go:7 +0x2c
  exit status 2
cat: go
description: You wrote to a map that was declared but never initialised. A nil map can be read from, but any write panics. Create it with make() or a literal first.
tldr: "Initialise the map before writing: `m := make(map[string]int)` or `m := map[string]int{}`. For struct fields, initialise them in a constructor (`func NewX() *X { return &X{items: map[string]int{}} }`) or lazily (`if s.items == nil { s.items = make(map[string]int) }`). Nested maps need each inner map created too."
keywords: go golang panic assignment to entry in nil map make map initialize struct field nested map json unmarshal
related: [go-all-goroutines-are-asleep-deadlock, go-undefined, go-declared-and-not-used]
---
## What it means

The zero value of a map type in Go is `nil`. A nil map behaves like an empty map for reading — `len(m)` is 0, `m["x"]` returns the zero value, `range` does nothing, `delete` is a no-op — but writing to it panics at runtime, because there is no hash table allocated to store the entry.

```go
var m map[string]int   // nil
fmt.Println(m["a"])    // 0, fine
m["a"] = 1             // panic: assignment to entry in nil map
```

The stack trace shows the file and line of the write.

## Fix 1: create the map with `make` or a literal

```go
m := make(map[string]int)          // empty, ready to use
m := make(map[string]int, 100)     // with a capacity hint
m := map[string]int{}              // same as make, literal form
m := map[string]int{"a": 1}        // pre-filled
```

`var m map[string]int` alone only declares it.

## Cause 2: map field in a struct

Struct fields get zero values, so a map field is nil until you set it:

```go
type Cache struct {
    items map[string]string
}

c := Cache{}            // or &Cache{}, or var c Cache
c.items["k"] = "v"      // panic
```

Fix with a constructor:

```go
func NewCache() *Cache {
    return &Cache{items: make(map[string]string)}
}
```

Or initialise lazily in the method that writes, which also makes the zero value usable:

```go
func (c *Cache) Set(k, v string) {
    if c.items == nil {
        c.items = make(map[string]string)
    }
    c.items[k] = v
}
```

Lazy init must use a pointer receiver (`*Cache`), otherwise you initialise a copy. If several goroutines call it, protect it with a `sync.Mutex` (or use `sync.Map`) — concurrent map writes cause a separate fatal error.

## Cause 3: nested maps

Creating the outer map doesn't create the inner ones:

```go
graph := make(map[string]map[string]int)
graph["a"]["b"] = 1     // panic: graph["a"] is nil
```

Create the inner map on first use:

```go
inner, ok := graph["a"]
if !ok {
    inner = make(map[string]int)
    graph["a"] = inner
}
inner["b"] = 1
```

Often a composite key is simpler: `map[[2]string]int` or a struct key `map[edge]int`.

## Cause 4: maps inside slices

```go
rows := make([]map[string]any, 3)   // three nil maps
rows[0]["id"] = 1                   // panic
```

Fill each element: `for i := range rows { rows[i] = map[string]any{} }`, or build with `append(rows, map[string]any{"id": 1})`.

## Cause 5: a function returned a nil map

A function that returns `nil` on an early path (`return nil, err`) and a caller that ignores the error and writes to the result. Check the error, or have the function return an empty map instead of nil.

Note that `json.Unmarshal` into a struct allocates maps when the JSON has the key; if the key is missing, the field stays nil. Initialise it before writing to it.

## Finding it

Run with the race detector and full traces when it's intermittent:

```bash
go run -race .
GOTRACEBACK=all go run .
```

The top frame of the panic is the exact line; the variable being indexed there is nil. `go vet` doesn't catch this, but staticcheck sometimes flags obvious cases (`SA5000`).
