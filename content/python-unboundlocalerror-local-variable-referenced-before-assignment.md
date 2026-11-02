---
error: "UnboundLocalError: local variable referenced before assignment"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 7, in <module>
      increment()
    File "app.py", line 4, in increment
      count += 1
  UnboundLocalError: local variable 'count' referenced before assignment
  UnboundLocalError: cannot access local variable 'count' where it is not associated with a value
cat: python
description: A function assigns to a name somewhere, which makes it local for the whole function, but the code reads it before any assignment has run. Usually you meant the global variable, or a branch skipped the assignment.
tldr: "If you meant the module-level variable, add `global count` (or `nonlocal count` in a nested function) at the top of the function — or better, pass it in and return the new value. If a branch can skip the assignment, initialise the variable first (e.g. `result = None`) before the `if`/`try`/`for`."
keywords: python unboundlocalerror local variable referenced before assignment cannot access local variable where it is not associated with a value global nonlocal scope
related: [python-nameerror-name-is-not-defined, python-attributeerror-nonetype-object-has-no-attribute, python-keyerror]
---
## What it means

Python decides whether a name is local **when the function is compiled**, not line by line. If a function assigns to a name anywhere in its body (`x = ...`, `x += ...`, `for x in`, `import x`, `except E as x`, `with ... as x`), that name is local throughout the entire function. Reading it before an assignment has executed raises `UnboundLocalError`.

Python 3.11+ words it as `cannot access local variable 'x' where it is not associated with a value`. Same error.

## Cause 1: modifying a global inside a function

```python
count = 0

def increment():
    count += 1      # UnboundLocalError
```

`count += 1` is an assignment, so `count` is local, and reading the local before it's set fails. Options:

```python
# Option A: declare it global
def increment():
    global count
    count += 1

# Option B (cleaner): pass and return
def increment(count):
    return count + 1

count = increment(count)
```

For mutable state, a class or a dict avoids `global` entirely:

```python
state = {"count": 0}
def increment():
    state["count"] += 1   # mutating, not rebinding: no error
```

## Cause 2: nested functions / closures

```python
def make_counter():
    total = 0
    def add():
        total += 1     # UnboundLocalError
        return total
    return add
```

Use `nonlocal` to rebind the enclosing function's variable:

```python
    def add():
        nonlocal total
        total += 1
        return total
```

## Cause 3: assignment only in some branches

```python
def grade(score):
    if score >= 50:
        result = "pass"
    elif score >= 0:
        result = "fail"
    return result      # error when score < 0
```

Initialise before branching, or add an `else`:

```python
def grade(score):
    result = None
    if score >= 50:
        result = "pass"
    elif score >= 0:
        result = "fail"
    return result
```

Same with `try`/`except`: if the `try` fails before assignment, the variable doesn't exist afterwards.

```python
try:
    data = load()
except IOError:
    log.warning("load failed")
print(data)   # UnboundLocalError if load() raised
```

Set `data = None` before `try`, or `return`/`raise` in the `except`.

And with loops: a `for` loop over an empty iterable never assigns the loop variable.

## Cause 4: shadowing a global or import later in the function

```python
import os

def main():
    print(os.getcwd())   # UnboundLocalError
    import os            # this makes 'os' local for all of main()
```

Likewise, a later `len = 5` makes `len` local and breaks an earlier `len(x)`. Remove the late assignment or rename the variable.

## Cause 5: `except ... as e` is deleted after the block

```python
e = None
try:
    1 / 0
except ZeroDivisionError as e:
    pass
print(e)   # NameError/UnboundLocalError: 'e' is deleted at end of except
```

Python deletes `e` when the `except` block ends. Copy it: `except ZeroDivisionError as exc: err = exc`.
