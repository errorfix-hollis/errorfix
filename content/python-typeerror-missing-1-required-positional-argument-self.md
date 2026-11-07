---
error: "TypeError: missing 1 required positional argument: 'self'"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 9, in <module>
      Counter.increment()
  TypeError: Counter.increment() missing 1 required positional argument: 'self'
cat: python
description: "An instance method was called on the class itself instead of on an instance, so Python had nothing to pass as `self`. Create an instance first, or make the method a `@staticmethod`/`@classmethod`."
tldr: "Instantiate the class and call the method on the object: `c = Counter(); c.increment()` (note the parentheses after `Counter`). If the method doesn't need instance data, decorate it with `@staticmethod` (no `self`) or `@classmethod` (takes `cls`)."
keywords: python typeerror missing 1 required positional argument self instance method called on class instantiate staticmethod classmethod forgot parentheses
related: [python-typeerror-module-object-is-not-callable, python-nameerror-name-is-not-defined, python-attributeerror-nonetype-object-has-no-attribute]
---
## What it means

When you call `obj.method()`, Python passes `obj` as the first argument, `self`. When you call `ClassName.method()`, there is no object, so `self` is missing and Python reports it like any other missing argument.

```python
class Counter:
    def __init__(self):
        self.n = 0

    def increment(self):
        self.n += 1

Counter.increment()   # TypeError: ... missing 1 required positional argument: 'self'
```

## Cause 1: calling the method on the class

Fix: create an instance and call the method on it.

```python
c = Counter()
c.increment()
print(c.n)   # 1
```

## Cause 2: forgot the parentheses when creating the instance

This is the most common version of the bug:

```python
c = Counter       # c is the class, not an instance
c.increment()     # TypeError
```

Fix: `c = Counter()`. The same applies to callbacks and configuration, e.g. `app.add_handler(MyHandler)` vs `app.add_handler(MyHandler())` — check what the API expects.

## Cause 3: the method doesn't need an instance

If the method never uses `self`, make that explicit:

```python
class MathUtil:
    @staticmethod
    def square(x):
        return x * x

MathUtil.square(4)   # 16
```

If it needs the class (e.g. an alternative constructor), use `@classmethod`:

```python
class User:
    def __init__(self, name):
        self.name = name

    @classmethod
    def from_dict(cls, d):
        return cls(d["name"])

u = User.from_dict({"name": "ana"})
```

## Cause 4: `self` missing from the method definition, or a decorator in the wrong place

If you defined a method without `self` and call it on an instance, the error is the reverse (`takes 0 positional arguments but 1 was given`). If you added `@staticmethod` but kept `self` as a parameter, calling it without arguments gives *this* error, because `self` is now an ordinary parameter. Remove `self` from static methods.

## Cause 5: passing an unbound method as a callback

```python
import threading
t = threading.Thread(target=Worker.run)    # Worker is the class
t.start()                                   # TypeError inside the thread
```

Fix: pass a bound method from an instance: `w = Worker(); threading.Thread(target=w.run)`. The same applies to `map(Cls.method, ...)`, `sorted(key=...)`, button `command=` handlers in Tkinter, and Flask/FastAPI dependencies.

## Cause 6: frameworks that expect an instance

- **unittest / pytest**: don't call test methods directly on the `TestCase` class; let the runner instantiate it.
- **Django**: `MyView.get(request)` fails; route with `MyView.as_view()`.
- **Mocking**: `mock.patch.object(Class, "method")` replaces the function on the class; using `autospec=True` makes the mock require `self` too, so call it through an instance.

## Quick check

Print what you are calling on:

```python
print(type(c))   # <class 'type'> means you have the class, not an instance
```

An instance shows `<class '__main__.Counter'>`.
