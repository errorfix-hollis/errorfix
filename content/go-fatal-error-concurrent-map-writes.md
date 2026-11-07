---
error: "fatal error: concurrent map writes"
error_full: |
  fatal error: concurrent map writes

  goroutine 18 [running]:
  main.main.func1()
          /app/main.go:14 +0x4c
  created by main.main in goroutine 1
          /app/main.go:12 +0x5a
cat: go
description: "Two goroutines wrote to the same Go map at the same time. Go maps are not safe for concurrent use, and the runtime aborts the whole program (this is not a recoverable panic)."
tldr: "Protect the map with a `sync.Mutex` (or `sync.RWMutex` for read-heavy use): lock around every read and write. Alternatives: `sync.Map` for append-mostly caches, or give one goroutine ownership of the map and send it updates over a channel. Find all racy spots with `go run -race .` / `go test -race ./...`."
keywords: go golang fatal error concurrent map writes concurrent map read and map write sync.Mutex RWMutex sync.Map race detector -race goroutine map not thread safe
related: [go-panic-assignment-to-entry-in-nil-map, go-all-goroutines-are-asleep-deadlock, go-invalid-memory-address-or-nil-pointer-dereference]
---
## What it means

The built-in `map` type has no internal locking. The runtime detects some unsynchronized accesses and stops the program with one of:

- `fatal error: concurrent map writes`
- `fatal error: concurrent map read and map write`
- `fatal error: concurrent map iteration and map write`

It is a `fatal error`, not a `panic`, so `recover()` cannot catch it. The detection is best-effort: code that "works" may still be racy and crash later under load.

Typical trigger:

```go
m := map[string]int{}
var wg sync.WaitGroup
for i := 0; i < 100; i++ {
    wg.Add(1)
    go func(i int) {
        defer wg.Done()
        m[fmt.Sprint(i)] = i   // concurrent writes
    }(i)
}
wg.Wait()
```

In web servers it shows up when a handler writes to a package-level map: every request runs in its own goroutine.

## Fix 1: guard the map with a mutex

```go
type SafeCounter struct {
    mu sync.Mutex
    m  map[string]int
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.m[key]++
}

func (c *SafeCounter) Get(key string) int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.m[key]
}
```

Lock around **reads too**, including `len(m)` and `for range m`. For many readers and few writers use `sync.RWMutex` with `RLock()`/`RUnlock()` on reads.

Pass the struct by pointer (`*SafeCounter`); copying a struct copies the mutex and breaks the protection (`go vet` warns about this).

## Fix 2: `sync.Map`

The standard library has a concurrent map tuned for keys written once and read many times, or goroutines working on disjoint keys:

```go
var cache sync.Map

cache.Store("a", 1)
if v, ok := cache.Load("a"); ok {
    fmt.Println(v.(int))
}
v, loaded := cache.LoadOrStore("b", 2)
cache.Range(func(k, v any) bool { fmt.Println(k, v); return true })
```

It is untyped (`any`), and for general read/write workloads a mutex-protected map is usually as fast and clearer.

## Fix 3: one owner goroutine

Let only one goroutine touch the map and send it work through channels:

```go
type inc struct{ key string }
updates := make(chan inc)
go func() {
    counts := map[string]int{}
    for u := range updates {
        counts[u.key]++
    }
}()
updates <- inc{"x"}
```

Or collect results per goroutine and merge them after `wg.Wait()`.

## Find every racy access

Run with the race detector; it reports both goroutines' stack traces, even when the program doesn't crash:

```bash
go run -race .
go test -race ./...
```

It needs cgo on some platforms (`CGO_ENABLED=1`). Fix every `WARNING: DATA RACE` it prints, not just the map.

## Common hidden cases

- A map stored in a struct that is shared between goroutines (e.g. a `Config` with a `map` field mutated at runtime).
- Writing to a map inside `http.HandlerFunc`s, gRPC handlers or `errgroup` workers.
- Passing a map to a goroutine: maps are reference types, so "copying" the variable still shares the data. Copy entries into a new map if each goroutine needs its own.
