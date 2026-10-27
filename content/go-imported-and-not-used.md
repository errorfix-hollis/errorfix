---
error: "\"fmt\" imported and not used"
error_full: './main.go:4:2: "fmt" imported and not used'
cat: go
description: Go doesn't compile with unused imports. Remove the import, or let goimports manage imports automatically.
tldr: "Delete the unused import line. Better: run `goimports -w .` (or enable format-on-save with gopls), which adds and removes imports for you. To keep a package for its side effects, import it as `_ \"pkg\"`."
keywords: golang imported and not used unused import goimports gopls blank import side effects
related: [go-declared-and-not-used]
---
## What it means

Every import must be used in that file. Unused imports slow down builds and hide mistakes, so the compiler rejects them.

## Fix 1: remove it

```go
import (
    "fmt"     // delete this if nothing in the file calls fmt.*
    "os"
)
```

## Fix 2: let a tool handle imports

```bash
go install golang.org/x/tools/cmd/goimports@latest
goimports -w .
```

In VS Code with the Go extension (gopls), imports are organised on save by default.

## Fix 3: imports for side effects

Some packages register themselves in `init()` (database drivers, image decoders, `net/http/pprof`). Import them with the blank identifier:

```go
import (
    "database/sql"
    _ "github.com/lib/pq"
)
```

## Fix 4: temporarily keep it while debugging

```go
var _ = fmt.Println
```

Remove it when you're done.
