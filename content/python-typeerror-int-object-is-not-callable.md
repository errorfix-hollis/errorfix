---
error: "TypeError: 'int' object is not callable"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 4, in <module>
      total = sum(numbers)
  TypeError: 'int' object is not callable
cat: python
description: "You put parentheses after something that is an integer. Usually a built-in like `sum`, `len`, `max` or `round` was overwritten by a variable, or a multiplication sign is missing."
tldr: "Find the name before the `(` on the failing line. If you assigned a variable called `sum`, `len`, `max`, `min`, `int`, `round` or `range`, rename it and restart the interpreter/kernel (or `del sum`). If it's math like `2(x + 1)`, write `2 * (x + 1)`."
keywords: python typeerror int object is not callable sum len max round shadowing builtin missing multiplication operator jupyter
related: [python-typeerror-str-object-is-not-callable, python-typeerror-list-object-is-not-callable, python-typeerror-module-object-is-not-callable]
---
## What it means

`x(...)` calls `x`. Python found that `x` is an `int`, and integers can't be called like functions. The failing line always contains a name or expression followed by `(` — that thing evaluated to a number.

## Cause 1: you shadowed a built-in function

The classic case:

```python
sum = 0
for n in numbers:
    sum += n
...
total = sum(other_numbers)   # TypeError: sum is now an int
```

Any assignment to `sum`, `len`, `max`, `min`, `round`, `abs`, `int`, `range`, `pow`, `id` or `hash` replaces the built-in in that scope. Fix: rename the variable.

```python
total = 0
for n in numbers:
    total += n
```

**In Jupyter / IPython** the bad assignment survives in the kernel even after you fix the code. Either restart the kernel, or remove the name so the built-in is visible again:

```python
del sum
```

Find shadowed built-ins quickly:

```python
import builtins
print([n for n in dir(builtins) if n in globals()])
```

## Cause 2: missing multiplication operator

Maths notation doesn't work in Python:

```python
area = 2(r + 1)        # TypeError: 'int' object is not callable
y = x(x + 1)           # same, if x is an int
```

Write the operator:

```python
area = 2 * (r + 1)
y = x * (x + 1)
```

## Cause 3: an attribute and a method share a name

```python
class Counter:
    def __init__(self):
        self.count = 0
    def count(self):       # hidden by the instance attribute above
        return self.count

c = Counter()
c.count()                  # TypeError
```

The instance attribute `self.count` wins over the method. Use distinct names, e.g. `self._count` and `def count(self)`, or make it a `@property` and access it without parentheses.

## Cause 4: calling a value instead of using it

Some library attributes are numbers, not methods:

```python
df.size()       # pandas: size is an int property -> TypeError
df.size         # correct
arr.ndim()      # numpy: also a property
len(items)()    # extra parentheses after a call
```

Remove the parentheses. For pandas, `df.shape`, `df.size` and `df.ndim` are properties; `df.count()` is a method.

## How to debug

Print the type of each callable on the failing line:

```python
print(type(sum), type(len))
```

`<class 'int'>` instead of `<class 'builtin_function_or_method'>` tells you which name was overwritten. Then search the file (and earlier notebook cells) for `sum =`.
