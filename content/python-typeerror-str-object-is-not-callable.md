---
error: "TypeError: 'str' object is not callable"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 4, in <module>
      print(str(42))
  TypeError: 'str' object is not callable
cat: python
description: You used parentheses on something that is a string. Almost always a built-in such as str, input or a method name was overwritten by a variable, or parentheses were used where indexing or a format operator was meant.
tldr: "Find where the name was reassigned (e.g. `str = \"...\"`, `input = input()`), rename that variable, and restart the interpreter/kernel (`del str` in a notebook). Use `s[0]` not `s(0)` for indexing, and `\"...\" % x` or f-strings, not `\"...\"(x)`."
keywords: python typeerror str object is not callable shadowing builtin str input variable named str jupyter kernel restart property attribute method same name f-string
related: [python-typeerror-module-object-is-not-callable, python-nameerror-name-is-not-defined, python-typeerror-unsupported-operand-types]
---
## What it means

`x()` calls `x`. When `x` is a string, Python raises `TypeError: 'str' object is not callable`. Look at the line in the traceback and ask, for every `name(` on it: is `name` actually a string right now?

```python
print(type(str), type(input))   # should be <class 'type'> / builtin_function_or_method
```

## Cause 1: a variable shadows the `str` built-in

```python
str = "hello"
...
label = str(42)      # TypeError: 'str' object is not callable
```

Rename the variable (`text`, `s`, `name`...). In Jupyter or an interactive shell, the bad assignment persists even after you edit the cell — undo it:

```python
del str          # restores the built-in
```

or restart the kernel.

The same happens with other built-ins: `input`, `format`, `type`, `id`, `print` (`print = "x"`), `max`, `sum`. A classic:

```python
input = input("Name: ")
age = input("Age: ")     # TypeError: 'str' object is not callable
```

## Cause 2: an attribute or method name collides

```python
class User:
    def __init__(self, name):
        self.name = name
    def name(self):            # replaced by the instance attribute
        return self.name

User("a").name()   # TypeError: 'str' object is not callable
```

The instance attribute `self.name` (a string) hides the method. Rename one of them (`get_name`), or use `@property` and access it without parentheses:

```python
class User:
    def __init__(self, name):
        self._name = name
    @property
    def name(self):
        return self._name

User("a").name      # no ()
```

Also: calling a property with `()` gives the same error, e.g. `response.text()` in `requests` — `.text` is a string property; use `response.text` (but `response.json()` *is* a method).

## Cause 3: parentheses instead of brackets

```python
s = "abcdef"
s(0)        # wrong
s[0]        # 'a'
```

## Cause 4: missing operator when formatting

```python
msg = "Total: %d" (total)     # missing %
msg = "Hi " "there" (name)    # missing +
```

Fix:

```python
msg = "Total: %d" % total
msg = f"Total: {total}"
msg = "Hi " + name
```

## Cause 5: a function was replaced by its result

```python
def get_title(): return "Report"
get_title = get_title()   # now a string
get_title()               # TypeError
```

Or a callback parameter receives a string instead of a function:

```python
def run(callback):
    callback()

run("my_func")      # wrong: pass my_func, not its name
run(my_func)
```

If you need to look up a function by name, use a dict: `handlers = {"save": save}` then `handlers[name]()`.

## Finding the culprit fast

Search for assignments to the name:

```bash
grep -nE '^\s*(str|input|format|type)\s*=' *.py
```

Linters catch this too: `pylint` reports `redefined-builtin` (W0622), and `ruff` has rule `A001` (builtin-variable-shadowing).
