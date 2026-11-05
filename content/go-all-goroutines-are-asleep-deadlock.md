---
error: "fatal error: all goroutines are asleep - deadlock!"
error_full: |
  fatal error: all goroutines are asleep - deadlock!

  goroutine 1 [chan send]:
  main.main()
  	/home/me/app/main.go:7 +0x31
  exit status 2
cat: go
description: Every goroutine in the program is blocked waiting on a channel, mutex or WaitGroup that nothing will ever release, so the Go runtime aborts. Usually an unbuffered send with no receiver, a range over a channel that is never closed, or a WaitGroup count that never reaches zero.
tldr: "Read the goroutine dump: `[chan send]`, `[chan receive]`, `[semacquire]` (WaitGroup/Mutex) and the file:line show where each one is stuck. Make sure every send has a receiver running in another goroutine (or use a buffered channel), `close(ch)` after the last send when you `range` over it, and call `wg.Add` before starting goroutines with `defer wg.Done()` inside them."
keywords: go golang fatal error all goroutines are asleep deadlock channel unbuffered send receive range close waitgroup wait mutex lock select goroutine
related: [go-declared-and-not-used, go-undefined, go-cannot-find-main-module]
---
## What it means

The Go runtime noticed that no goroutine can make progress: each is blocked on a channel operation, `sync.WaitGroup.Wait`, `sync.Mutex.Lock` or `select {}`. Nothing can wake them, so it exits with status 2 and prints each goroutine's stack. The bracketed state tells you what it's waiting on:

- `[chan send]` / `[chan receive]` — channel operation
- `[semacquire]` / `[sync.WaitGroup.Wait]` / `[sync.Mutex.Lock]` — WaitGroup or mutex
- `[select (no cases)]` — an empty `select {}`

The runtime only detects this when **all** goroutines are blocked. If some unrelated goroutine (an HTTP server, a timer) is still alive, a deadlock just hangs instead.

## Cause 1: unbuffered send with no receiver

```go
func main() {
    ch := make(chan int)
    ch <- 1          // blocks forever: nobody is receiving
    fmt.Println(<-ch)
}
```

An unbuffered send waits for a receiver. Receive in another goroutine, or give the channel a buffer:

```go
ch := make(chan int)
go func() { ch <- 1 }()
fmt.Println(<-ch)

// or
ch := make(chan int, 1)
ch <- 1
fmt.Println(<-ch)
```

## Cause 2: `range` over a channel that's never closed

```go
ch := make(chan int)
go func() {
    for i := 0; i < 3; i++ {
        ch <- i
    }
    // missing close(ch)
}()
for v := range ch {   // after 3 values, waits forever
    fmt.Println(v)
}
```

The sender must close it when done:

```go
go func() {
    defer close(ch)
    for i := 0; i < 3; i++ {
        ch <- i
    }
}()
```

With several senders, close after all are finished:

```go
var wg sync.WaitGroup
for _, job := range jobs {
    wg.Add(1)
    go func(j Job) {
        defer wg.Done()
        results <- process(j)
    }(job)
}
go func() { wg.Wait(); close(results) }()
for r := range results { ... }
```

## Cause 3: WaitGroup that never reaches zero

```go
var wg sync.WaitGroup
for i := 0; i < 3; i++ {
    wg.Add(1)
    go work(i, wg)   // copies wg: Done() runs on the copy
}
wg.Wait()            // deadlock
```

Pass a pointer (`&wg`) or use a closure, and make sure every `Add(1)` has exactly one `Done()` — `defer wg.Done()` at the top of the goroutine handles early returns. `go vet` flags copied WaitGroups and mutexes ("passes lock by value").

Also common: calling `wg.Wait()` before reading results from an unbuffered channel the workers are blocked sending on. Read results in a separate goroutine, or close via the pattern above.

## Cause 4: locking a mutex twice

`sync.Mutex` is not reentrant:

```go
func (s *Store) Get() int {
    s.mu.Lock()
    defer s.mu.Unlock()
    return s.compute()   // compute() also calls s.mu.Lock() -> deadlock
}
```

Have an internal `computeLocked()` that assumes the lock is held, and only lock in public methods. Also check for a missing `Unlock` on an early `return` — `defer` avoids that.

## Cause 5: `select {}` or `<-done` with nothing to signal

An empty `select {}` blocks forever; that's fine in a server where other goroutines run, but a deadlock once they exit. Use `signal.NotifyContext` to wait for Ctrl+C instead.

## Debugging tips

- Run with `go run -race .` to catch the data races that often accompany these bugs.
- For hangs that aren't detected, send `SIGQUIT` (Ctrl+\\) to dump all goroutine stacks, or expose `net/http/pprof` and open `/debug/pprof/goroutine?debug=2`.
