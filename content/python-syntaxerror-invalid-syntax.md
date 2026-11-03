---
error: "SyntaxError: invalid syntax"
error_full: |2
    File "script.py", line 4
      if x = 5:
         ^
  SyntaxError: invalid syntax
cat: python
description: Python could not parse your code. The caret points at where parsing failed; the real mistake is often on that line or the line just before it (missing bracket, quote or colon).
tldr: "Look at the caret and the line above it. Check for unclosed `(` `[` `{` or quotes on earlier lines, a missing `:` after `if`/`for`/`def`, `=` instead of `==`, Python 2 code like `print \"x\"`, or new syntax (`match`, walrus `:=`) on an older Python — check `python --version`."
keywords: python syntaxerror invalid syntax caret missing colon unclosed parenthesis print python 2 f-string version match walrus pip install in repl
related: [python-indentationerror-unexpected-indent, python-taberror-inconsistent-use-of-tabs, python-nameerror-name-is-not-defined]
---
## What it means

The parser hit a token it didn't expect. Nothing in the file runs — syntax errors are reported before execution. Recent Python versions (3.10+) give much more specific messages like `'(' was never closed` or `expected ':'`; on older versions you just get `invalid syntax`. If you can, run the file with a newer Python to get a better hint.

## Cause 1: unclosed bracket or quote on a previous line

```python
data = {"a": 1, "b": [1, 2, 3}
print(data)        # error is reported here (or above)
```

The parser only notices when the next line doesn't make sense. Count brackets on the lines *before* the caret. An editor with bracket matching makes this quick.

## Cause 2: missing colon

```python
def greet(name)      # missing :
    print(name)

for i in range(3)    # missing :
```

Every `if`, `elif`, `else`, `for`, `while`, `def`, `class`, `try`, `except`, `finally`, `with` and `match/case` line ends with `:`.

## Cause 3: = instead of ==

```python
if x = 5:      # assignment isn't allowed here
if x == 5:     # comparison
```

Python 3.10+ says `Maybe you meant '==' or ':=' instead of '='?`.

## Cause 4: Python 2 code

```python
print "hello"                 # Python 2
print("hello")                # Python 3

except Exception, e:          # Python 2
except Exception as e:        # Python 3
```

Old tutorials and scripts often have this. Running `python` may also start Python 2 on old systems — check with `python --version` and use `python3`.

## Cause 5: syntax newer than your interpreter

- `match`/`case` needs Python 3.10+
- `:=` (walrus) needs 3.8+
- f-strings need 3.6+; nested same-type quotes inside f-strings (`f"{d["k"]}"`) need 3.12+
- `X | Y` type unions in annotations evaluate at runtime only on 3.10+ (that one is a `TypeError`, not a syntax error)

```bash
python3 --version
```

Upgrade Python or rewrite the line (e.g. `f"{d['k']}"`).

## Cause 6: running shell commands inside Python

```python
>>> pip install requests
  File "<stdin>", line 1
    pip install requests
        ^^^^^^^
SyntaxError: invalid syntax
```

`pip`, `python script.py`, `cd` etc. are terminal commands. Exit the REPL with `exit()` and run them in your shell. In Jupyter, use `%pip install requests`.

## Cause 7: reserved words as names

```python
class = "A"     # invalid
from = 1        # invalid
lambda = 0.5    # invalid
```

Rename (`cls`, `from_`, `lam`). See the list with `import keyword; print(keyword.kwlist)`.

## Cause 8: invisible or smart characters

Code copied from web pages or docs may contain curly quotes (`“ ”`) or non-breaking spaces. Python 3 reports `invalid character '“' (U+201C)`. Retype the quotes, or find them:

```bash
grep -nP '[^\x00-\x7F]' script.py
```

## Getting the exact location

```bash
python3 -m py_compile script.py
```

reports the first syntax error with line and column without running anything.
