---
error: "panic: runtime error: invalid memory address or nil pointer dereference"
error_full: |
  panic: runtime error: invalid memory address or nil pointer dereference
  [signal SIGSEGV: segmentation violation code=0x1 addr=0x0 pc=0x47c8f2]

  goroutine 1 [running]:
  main.main()
  	/home/me/app/main.go:14 +0x32
  exit status 2
cat: go
description: Your code used a nil pointer, nil interface or nil function as if it pointed to something — usually a value returned together with an error that wasn't checked, or a struct field never initialised.
tldr: "Read the stack trace: the first frame in your code is the line. Check `err` before using the returned value (`if err != nil { return err }`), initialise pointer fields (`&T{}`, constructors), and guard optional values with `if x != nil`. Run `go vet ./...` and test with `-race`."
keywords: go golang panic runtime error invalid memory address or nil pointer dereference sigsegv segmentation violation addr=0x0 err != nil http response body
related: [go-panic-assignment-to-entry-in-nil-map, go-all-goroutines-are-asleep-deadlock, linux-segmentation-fault-core-dumped]
---
## What it means

You accessed a field or called a method through a pointer that is `nil`, so Go tried to read memory at an address near 0 (`addr=0x0` or a small offset like `addr=0x18` = a field 24 bytes into the struct). The runtime turns the resulting SIGSEGV into this panic.

```go
var u *User
fmt.Println(u.Name)   // panic
```

## Read the stack trace first

```text
goroutine 1 [running]:
main.(*Server).handle(0x0, ...)
	/home/me/app/server.go:42 +0x1d
main.main()
	/home/me/app/main.go:14 +0x32
```

The topmost frame in *your* code is where it happened (here `server.go:42`). A receiver of `0x0` means the method was called on a nil pointer. Look at every `x.` on that line — one of those `x` is nil.

## Cause 1: using a result without checking the error

The classic:

```go
resp, err := http.Get(url)
defer resp.Body.Close()   // resp is nil when err != nil -> panic
if err != nil { ... }
```

Always check the error first:

```go
resp, err := http.Get(url)
if err != nil {
    return fmt.Errorf("get %s: %w", url, err)
}
defer resp.Body.Close()
```

Same with `sql.Open`, `os.Open`, `json.Decoder`, gRPC clients, etc. By convention a function returning `(*T, error)` returns `nil` for `*T` when it fails.

## Cause 2: pointer field in a struct never set

```go
type Server struct {
    db     *sql.DB
    logger *log.Logger
}

s := &Server{}
s.logger.Println("start")   // logger is nil -> panic
```

Use a constructor that sets everything, and fail early if a dependency is missing:

```go
func NewServer(db *sql.DB, l *log.Logger) *Server {
    if l == nil {
        l = log.Default()
    }
    return &Server{db: db, logger: l}
}
```

## Cause 3: shadowing with `:=`

```go
var db *sql.DB

func initDB() error {
    db, err := sql.Open("postgres", dsn)   // new local db, global stays nil
    ...
}
```

The `:=` declares a *new* `db` inside the function. Use `=`:

```go
func initDB() error {
    var err error
    db, err = sql.Open("postgres", dsn)
    return err
}
```

`go vet` with the shadow analyzer can catch this.

## Cause 4: map lookups returning a nil pointer

```go
users := map[string]*User{}
u := users["bob"]      // nil if missing
u.Name = "Bob"         // panic
```

Use the comma-ok form:

```go
u, ok := users["bob"]
if !ok {
    return ErrNotFound
}
```

## Cause 5: nil function or interface method

Calling a nil func variable (`var cb func(); cb()`) or a method on a nil interface value also panics with this message. Check `if cb != nil`. Beware the "typed nil" trap: an interface holding a `(*T)(nil)` is *not* `== nil`, so return a literal `nil` for interfaces, not a nil `*T`.

## Cause 6: optional JSON / protobuf fields

Pointer fields in decoded structs (`*Address`, `*time.Time`) are nil when the field was absent. Guard them, or use protobuf getters (`msg.GetAddress().GetCity()`), which are nil-safe.

## Prevention

```bash
go vet ./...
go test -race ./...
staticcheck ./...        # SA5011 flags possible nil dereferences
```

Tools like `nilaway` (from Uber) do deeper nil-flow analysis. In HTTP servers, `net/http` recovers panics per request, but your goroutines don't — add a `defer func() { if r := recover(); r != nil { ... } }()` only at goroutine boundaries, and still fix the root cause.
