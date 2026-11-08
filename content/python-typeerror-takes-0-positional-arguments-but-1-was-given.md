---
error: "TypeError: takes 0 positional arguments but 1 was given"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 9, in <module>
      c.greet()
  TypeError: Greeter.greet() takes 0 positional arguments but 1 was given
cat: python
description: "A function received more positional arguments than it defines. In classes it's almost always a method missing `self`, because Python passes the instance as the first argument automatically."
tldr: "Add `self` as the first parameter of the method: `def greet(self):`. If the method really doesn't need the instance, decorate it with `@staticmethod`. For callbacks (Tkinter, signal handlers, `map`), accept the argument the caller passes, e.g. `def on_click(event):`."
keywords: python typeerror takes 0 positional arguments but 1 was given takes 1 positional argument but 2 were given missing self method staticmethod callback tkinter event
related: [python-typeerror-missing-1-required-positional-argument-self, python-attributeerror-nonetype-object-has-no-attribute, python-nameerror-name-is-not-defined]
---
## What it means

The function signature accepts fewer positional arguments than the call supplies. The numbers tell you how many: "takes 0 ... but 1 was given" means the function has no parameters but received one. "takes 1 positional argument but 2 were given" is the same bug with one parameter.

If the extra argument isn't visible in your call, something is passing it implicitly. Usually that's Python passing `self`.

## Cause 1: a method without `self`

```python
class Greeter:
    def greet():            # no self
        print("hi")

Greeter().greet()           # TypeError: takes 0 positional arguments but 1 was given
```

`obj.greet()` is really `Greeter.greet(obj)`, so the instance is passed as the first argument.

**Fix:**

```python
class Greeter:
    def greet(self):
        print("hi")
```

The same applies to methods with other parameters: `def add(x, y)` called as `obj.add(1, 2)` gives "takes 2 positional arguments but 3 were given". Write `def add(self, x, y)`.

## Cause 2: the method doesn't need the instance

Use `@staticmethod` (no implicit argument) or `@classmethod` (receives the class as `cls`):

```python
class MathUtil:
    @staticmethod
    def square(x):
        return x * x

    @classmethod
    def create(cls):
        return cls()

MathUtil.square(3)
MathUtil().square(3)    # also fine
```

## Cause 3: a callback receives an argument you didn't expect

Many frameworks call your function with an argument:

```python
# Tkinter bind() passes an event object
button.bind("<Button-1>", on_click)
def on_click():         # TypeError: on_click() takes 0 positional arguments but 1 was given
    ...
```

**Fix:** accept it (and ignore it if unused), or give it a default so the function works both ways:

```python
def on_click(event=None):
    ...
```

Other common cases:

- `signal.signal(signal.SIGINT, handler)` calls `handler(signum, frame)`.
- `threading.Thread(target=work, args=(x,))` passes `x`; note `args=(x)` without the comma is not a tuple and unpacks a string into many arguments.
- `map(func, items)`, `sorted(key=func)`, `df.apply(func)` pass one item at a time.
- Django views receive `request`; Flask error handlers receive the exception.

## Cause 4: you passed arguments positionally that should be keywords

Functions with keyword-only parameters (after `*`) reject positional arguments:

```python
def connect(*, host, port):
    ...

connect("localhost", 5432)            # TypeError: takes 0 positional arguments but 2 were given
connect(host="localhost", port=5432)  # OK
```

Check the library's signature with `help(func)` or `inspect.signature(func)`, especially after an upgrade that made parameters keyword-only.

## Cause 5: name shadowing

You defined a function with the same name as one you meant to call (or imported), so the call hits your zero-argument version. Rename your function, or check `print(func, func.__module__)` to see which object you're really calling.

For the opposite error, where an argument is missing instead of extra, see [missing 1 required positional argument: 'self'](/python/python-typeerror-missing-1-required-positional-argument-self/).
