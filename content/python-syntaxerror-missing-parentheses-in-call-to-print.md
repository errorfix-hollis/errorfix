---
error: "SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...)?"
error_full: |2
    File "script.py", line 3
      print "Hello, world"
      ^^^^^^^^^^^^^^^^^^^^
  SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...)?
cat: python
description: "You're running Python 2 code (print statement) on Python 3, where print is a function. Add parentheses, convert the file with a tool, or run it with the Python version it was written for."
tldr: "Change `print \"text\"` to `print(\"text\")` and `print x, y` to `print(x, y)`. For a whole project on Python 3.12 or older, convert automatically with `2to3 -w file.py` (removed in Python 3.13; run it from a `python:3.12` container instead). If it's a third-party script, it needs a Python 3 version of the package."
keywords: python syntaxerror missing parentheses in call to print did you mean print python 2 to 3 print statement 2to3 exec
related: [python-syntaxerror-invalid-syntax, python-attributeerror-dict-object-has-no-attribute-iteritems, python-indentationerror-unexpected-indent]
---
## What it means

In Python 2, `print` was a statement: `print "hi"`. In Python 3 it is a normal function and must be called with parentheses: `print("hi")`. Python 3 recognises the old form and gives this specific hint instead of a generic `invalid syntax`. A similar message exists for `exec`: `Missing parentheses in call to 'exec'`.

Whole file fails, because it's a *syntax* error: nothing runs, not even the lines before it.

## Fix 1: add the parentheses

| Python 2 | Python 3 |
|---|---|
| `print "hi"` | `print("hi")` |
| `print x, y` | `print(x, y)` |
| `print "a",` (no newline) | `print("a", end=" ")` |
| `print >>sys.stderr, "err"` | `print("err", file=sys.stderr)` |
| `print "%s=%d" % (k, v)` | `print("%s=%d" % (k, v))` or `print(f"{k}={v}")` |
| `print` (empty line) | `print()` |

## Fix 2: convert a whole codebase

If one file has print statements, it probably has other Python 2 constructs too (`dict.iteritems()`, `except E, e:`, `unicode`, `xrange`, integer division).

On Python 3.12 or older, the bundled `2to3` tool rewrites files in place:

```bash
2to3 -w myscript.py           # or: python3 -m lib2to3 -w myscript.py
2to3 -w -n src/               # whole folder, no .bak backups
```

`lib2to3` / `2to3` was removed in Python 3.13. On newer systems, run it from a Python 3.12 container just for the conversion:

```bash
docker run --rm -v "$PWD":/src -w /src python:3.12 python -m lib2to3 -w -n .
```

Review the diff afterwards; `2to3` sometimes wraps things in `list()` unnecessarily.

## Fix 3: you're running a Python 2-only tool

If the error comes from a file inside `site-packages` or a downloaded script, you're not meant to edit it. Options:

- Upgrade the package: `pip install --upgrade <package>`; most have Python 3 versions.
- Find a maintained fork or alternative.
- As a last resort, run it with Python 2 in a container: `docker run --rm -v "$PWD":/app -w /app python:2.7 python script.py`.

## Fix 4: `python` is Python 3 but the script expects Python 2

Check which interpreter runs:

```bash
python --version
head -1 script.py      # shebang, e.g. #!/usr/bin/env python
```

A shebang of `#!/usr/bin/env python` may resolve to Python 3 on modern systems (or not exist at all, see [command not found](/linux/linux-command-not-found/)). Fix the code rather than relying on Python 2, which has been end-of-life since 2020.

## Don't want to break Python 2 compatibility?

For code that must run on both, add this at the very top of each file:

```python
from __future__ import print_function
```

Then use `print(...)` everywhere; it works identically on 2.7 and 3.x.
