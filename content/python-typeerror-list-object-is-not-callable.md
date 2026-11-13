---
error: "TypeError: 'list' object is not callable"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 3, in <module>
      items = list(range(5))
  TypeError: 'list' object is not callable
cat: python
description: "You used parentheses on a list. Either you shadowed the built-in list() with a variable named list, or you wrote my_list(0) instead of my_list[0]."
tldr: "Rename any variable called `list` (e.g. `list = [...]` → `items = [...]`), then `del list` in an open REPL/notebook or restart the kernel. Use square brackets for indexing: `my_list[0]`, not `my_list(0)`."
keywords: python typeerror list object is not callable shadow builtin list variable named list square brackets indexing jupyter restart kernel
related: [python-typeerror-str-object-is-not-callable, python-typeerror-module-object-is-not-callable, python-typeerror-int-object-is-not-subscriptable]
---
## What it means

Writing `x(...)` calls `x`. When `x` is a list object, Python can't call it and raises this error. The traceback line shows which expression had the parentheses.

## Cause 1: you named a variable `list`

The most common cause. Assigning to `list` hides the built-in type for the rest of the scope:

```python
list = [1, 2, 3]          # shadows built-in list
...
numbers = list(range(5))  # TypeError: 'list' object is not callable
```

Fix: rename the variable.

```python
values = [1, 2, 3]
numbers = list(range(5))
```

In Jupyter or the REPL the bad assignment survives even after you edit the cell. Remove it or restart the kernel:

```python
del list
```

Same trap with `dict`, `str`, `set`, `tuple`, `sum`, `max`, `input`, `type`. Linters catch it: pylint `redefined-builtin`, ruff `A001`.

## Cause 2: parentheses instead of square brackets

```python
names = ["ana", "bo"]
print(names(0))     # wrong
print(names[0])     # right
```

Also for slices: `names[1:3]`, not `names(1:3)`.

## Cause 3: an attribute or method was overwritten by a list

```python
class Cart:
    def __init__(self):
        self.items = []
    def items(self):          # this method is hidden by self.items
        return self.items

Cart().items()                # TypeError
```

Give the attribute and the method different names (`self._items` and `def items(self)`), or use a `@property`.

## Cause 4: a function returns a list and you call the result

```python
def get_handlers():
    return [a, b]

get_handlers()()      # calling the returned list
```

Index first, then call: `get_handlers()[0]()`, or loop:

```python
for handler in get_handlers():
    handler()
```

## Cause 5: a parameter named `list`

```python
def process(list):
    return list(set(list))    # 'list' here is the argument
```

Rename the parameter to `items`.

## How to find it fast

```bash
grep -nE "^\s*list\s*=|def .*\(.*\blist\b" *.py
```

Or print the type right before the failing line: `print(type(list))` — if it shows `<class 'list'>` instead of `<class 'type'>`, it's shadowed.
