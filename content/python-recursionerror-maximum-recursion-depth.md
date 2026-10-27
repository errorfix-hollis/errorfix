---
error: "RecursionError: maximum recursion depth exceeded"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 2, in fact
      return n * fact(n - 1)
    [Previous line repeated 996 more times]
  RecursionError: maximum recursion depth exceeded
cat: python
description: A function called itself (directly or indirectly) about 1000 times without stopping. Usually a missing or wrong base case, or a property/__getattr__ that calls itself.
tldr: "Find the repeated line in the traceback and fix the base case so recursion stops. If the recursion is legitimately deep, rewrite it as a loop; `sys.setrecursionlimit()` is a last resort."
keywords: python recursionerror maximum recursion depth exceeded while calling a python object comparison setrecursionlimit property setter
related: [python-attributeerror-nonetype-object-has-no-attribute, python-keyerror]
---
## What it means

CPython limits the call stack to about 1000 frames (`sys.getrecursionlimit()`). Hitting it almost always means infinite recursion, not a problem that needs a bigger limit.

## Cause 1: missing or unreachable base case

```python
def fact(n):
    return n * fact(n - 1)      # never stops
```

```python
def fact(n):
    if n <= 1:                  # base case
        return 1
    return n * fact(n - 1)
```

Also check that the argument actually moves toward the base case (e.g. `fact(-1)` or `fact(2.5)` with `n == 1` as the check would never stop).

## Cause 2: a property or setter that calls itself

```python
class User:
    @property
    def name(self):
        return self.name        # calls the property again
    @name.setter
    def name(self, value):
        self.name = value       # calls the setter again
```

Store the value under a different attribute:

```python
    @property
    def name(self):
        return self._name
    @name.setter
    def name(self, value):
        self._name = value
```

The same happens in `__getattr__` / `__setattr__` that access `self.something` directly; use `object.__setattr__(self, ...)` or `self.__dict__`.

## Cause 3: a function shadowing a library name

```python
def print(*args):
    print("LOG:", *args)        # calls itself
```

Rename your function.

## Legitimately deep recursion

Deep tree walks or recursive algorithms on large inputs can exceed 1000 frames. Prefer an explicit stack:

```python
def walk(root):
    stack = [root]
    while stack:
        node = stack.pop()
        visit(node)
        stack.extend(node.children)
```

If you really must, raise the limit (and know that too high a value can crash the interpreter with a segfault):

```python
import sys
sys.setrecursionlimit(10_000)
```
