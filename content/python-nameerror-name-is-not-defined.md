---
error: "NameError: name 'x' is not defined"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 3, in <module>
      print(total)
  NameError: name 'total' is not defined
cat: python
description: Python looked up a name (variable, function, module or class) and found it in no enclosing scope. Typos, missing imports, using a name before it's assigned, and scope problems are the usual causes.
tldr: "Check spelling and case, add the missing import (`import os`, `from datetime import datetime`), make sure the variable is assigned before the line that uses it (and on every branch), and in notebooks re-run the cell that defines it. Quote strings: `input('yes')` not `input(yes)`."
keywords: python nameerror name is not defined not defined variable import missing typo scope function jupyter notebook did you mean
related: [python-modulenotfounderror-no-module-named, python-attributeerror-nonetype-object-has-no-attribute, python-keyerror]
---
## What it means

When Python executes a name, it searches local scope, then enclosing functions, then module globals, then builtins (the LEGB rule). If the name isn't found anywhere, you get `NameError`. Python 3.10+ often adds a hint like `Did you mean: 'totals'?` or `Did you forget to import 'os'?`.

## Cause 1: typo or wrong case

Names are case-sensitive: `Total`, `total` and `totla` are different.

```python
count = 5
print(Count)    # NameError: name 'Count' is not defined. Did you mean: 'count'?
```

Also common: `true`/`false`/`null` from other languages. Python uses `True`, `False`, `None`.

## Cause 2: missing import

```python
print(os.getcwd())        # NameError: name 'os' is not defined
```

```python
import os
from datetime import datetime
import numpy as np        # then use np, not numpy
import pandas as pd
```

If you wrote `from math import sqrt`, then `math.pi` is undefined; only `sqrt` was imported.

## Cause 3: used before it's assigned

Code runs top to bottom. A function or variable defined later in the file doesn't exist yet:

```python
greet()          # NameError
def greet():
    print("hi")
```

Move the definition above the call, or put the calling code in a `main()` called at the bottom:

```python
def main():
    greet()

def greet():
    print("hi")

if __name__ == "__main__":
    main()
```

## Cause 4: assigned only on some branches

```python
if score > 50:
    result = "pass"
print(result)     # NameError if score <= 50 (at module level)
```

Initialise before the branch: `result = None` (or `"fail"`). Inside a function the same bug raises `UnboundLocalError`, a subclass of `NameError`.

Same with `try`:

```python
try:
    data = load()
except IOError:
    pass
print(data)       # NameError if load() failed
```

## Cause 5: scope - the name lives in another function

Variables created inside a function are local to it:

```python
def setup():
    config = {"debug": True}

setup()
print(config)     # NameError
```

Return the value instead: `config = setup()` with `return config` in the function.

List comprehension variables and `except ... as e` names also don't exist after the block (`e` is deleted when the `except` block ends).

## Cause 6: a string without quotes

```python
name = input(Enter your name)      # SyntaxError
choice = input("y/n: ")
if choice == yes:                  # NameError: name 'yes' is not defined
```

Should be `choice == "yes"`. In Python 2, `input()` evaluated what was typed, so typing a word caused this error; run the script with `python3`.

## Cause 7: Jupyter / interactive sessions

Notebook cells share state only if they've been run. After a kernel restart, every name is gone. Use "Run All" or re-run the cell that defines the variable/import. Running cells out of order is the usual reason code "works on my machine" but fails on a fresh run.

## Cause 8: class attributes and `self`

Inside a method, instance and class attributes must be accessed through `self` (or the class name):

```python
class Cart:
    tax = 0.2
    def total(self, price):
        return price * (1 + tax)       # NameError
        # fix: return price * (1 + self.tax)
```
