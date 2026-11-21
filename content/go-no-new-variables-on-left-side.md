---
error: "no new variables on left side of :="
error_full: |
  ./main.go:12:6: no new variables on left side of :=
cat: go
description: "You used the short variable declaration := but every variable on the left already exists in the current scope. := must declare at least one new variable; use = to assign to existing ones."
tldr: "Change `:=` to `=` when the variable already exists: `err = doThing()`. With multiple values, `:=` is fine as long as at least one name is new: `n, err := f()`. Watch for shadowing in inner blocks, where `:=` creates a new variable instead of updating the outer one."
keywords: go golang no new variables on left side of := short variable declaration assignment err redeclare shadowing scope compile error
related: [go-declared-and-not-used, go-undefined, go-cannot-use-as-value-in-assignment]
---
## What it means

In Go, `x := value` means *declare and assign*. `x = value` means *assign to an existing variable*. If all names on the left of `:=` were already declared in the **same scope**, there's nothing new to declare, so the compiler stops.

## Cause 1: reassigning a variable

```go
count := 0
count := 5      // error
count = 5       // correct
```

The most common case is `err`:

```go
err := step1()
if err != nil { return err }
err := step2()  // error: no new variables
err = step2()   // correct
```

## Cause 2: multi-value assignment where all names exist

`:=` with several names is allowed when at least one is new; the existing ones are just assigned:

```go
f, err := os.Open("a.txt")   // declares f and err
data, err := io.ReadAll(f)   // OK: data is new, err is reused
f, err := os.Open("b.txt")   // error: f and err both exist
f, err = os.Open("b.txt")    // correct
```

Reusing `err` this way is idiomatic.

## Cause 3: named return values

Named results are already declared in the function scope:

```go
func load() (cfg Config, err error) {
    cfg, err := parse()   // error
    cfg, err = parse()    // correct
    return
}
```

## Cause 4: the blank identifier doesn't count

`_` is never a new variable:

```go
_, err := f()       // OK if err is new
_, err := g()       // error if err already exists in this scope
_, err = g()        // correct
```

## The opposite trap: shadowing

`:=` inside a new block (`if`, `for`, `switch`, closure) *does* compile, because the block is a new scope, but it creates a **different** variable that hides the outer one:

```go
var conn *Conn
if useTLS {
    conn, err := dialTLS()    // new conn, only inside the if
    _ = err
}
// conn is still nil here
```

Declare outside and assign inside:

```go
var conn *Conn
var err error
if useTLS {
    conn, err = dialTLS()
} else {
    conn, err = dial()
}
```

Run `go vet` with the shadow analyzer to find these:

```bash
go install golang.org/x/tools/go/analysis/passes/shadow/cmd/shadow@latest
go vet -vettool=$(which shadow) ./...
```

## Package-level variables

`:=` is not allowed outside functions at all (`syntax error: non-declaration statement outside function body`). At package level use `var x = value`.
