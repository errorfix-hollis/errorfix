---
error: "declared and not used"
error_full: "./main.go:8:2: declared and not used: result"
cat: go
description: Go refuses to compile code with unused local variables. Use the variable, remove it, or assign it to the blank identifier _.
tldr: "Remove the variable, or replace its name with `_` if you need the call but not the value: `_, err := doThing()`. Temporarily silence it with `_ = result`."
keywords: golang declared and not used imported and not used unused variable compile error blank identifier
related: [go-imported-and-not-used]
---
## What it means

Go treats an unused **local** variable as a compile error, not a warning. The idea is that an unused variable usually means a bug, such as assigning to the wrong variable. (Older Go versions phrase it `result declared but not used`.)

## Fix 1: you don't need the value

```go
// before
result, err := compute()
if err != nil { return err }

// after
_, err := compute()
if err != nil { return err }
```

## Fix 2: you'll use it later (temporary while coding)

```go
_ = result
```

Remove it before committing.

## The sneaky case: shadowing with :=

```go
var conn *Conn
if cfg.TLS {
    conn, err := dialTLS()   // := creates a NEW conn inside the if block
    ...
}
```

The inner `conn` is declared and not used, and the outer `conn` stays `nil`. Use plain assignment:

```go
var err error
if cfg.TLS {
    conn, err = dialTLS()
}
```

`go vet` with the shadow analyzer, or `golangci-lint`, can catch these.

## Package-level variables

The rule only applies inside functions. Unused package-level `var`s and unused function parameters compile fine.
