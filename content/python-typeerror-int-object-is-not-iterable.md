---
error: "TypeError: 'int' object is not iterable"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 3, in <module>
      for i in n:
  TypeError: 'int' object is not iterable
cat: python
description: "You used an integer where Python expects something it can loop over (a list, string, range, dict...). Usually a `for` loop over a number instead of `range(number)`."
tldr: "Loop over `range(n)` instead of `n`: `for i in range(n):`. For `len()` results use `for i in range(len(items)):` (or better, `for item in items:`). Don't pass a bare int to `list()`, `sum()`, `max()`, `sorted()` or tuple unpacking; wrap it in a list: `[n]`."
keywords: python typeerror int object is not iterable for loop range len sum list unpack integer iterate
related: [python-typeerror-float-object-is-not-iterable, python-typeerror-nonetype-object-is-not-iterable, python-typeerror-int-object-is-not-subscriptable]
---
## What it means

Python tried to iterate over a value of type `int`. Iteration happens in `for` loops, comprehensions, `in` checks, unpacking (`a, b = x`), and in functions that consume iterables like `list()`, `sum()`, `max()`, `min()`, `sorted()`, `set()`, `zip()`, `enumerate()` and `str.join()`. An integer is a single value, so none of these work on it.

The traceback line shows exactly which expression was the int.

## Cause 1: looping over a number instead of a range

```python
n = 5
for i in n:          # TypeError
    print(i)
```

Fix with `range()`:

```python
for i in range(n):          # 0..4
    print(i)
for i in range(1, n + 1):   # 1..5
    print(i)
```

The same mistake with `len()`:

```python
for i in len(items):          # TypeError: len() returns an int
for i in range(len(items)):   # works
for i, item in enumerate(items):  # usually nicer
```

## Cause 2: passing an int to sum(), max(), list()...

```python
total = sum(5)          # TypeError
biggest = max(price)    # price is a single int
```

These functions take a collection. Either pass the collection, or compare values directly:

```python
total = sum([a, b, c])
biggest = max(a, b)      # max/min also accept several arguments
nums = list(range(10))   # not list(10)
digits = [int(d) for d in str(12345)]   # iterate over the digits of a number
```

## Cause 3: unpacking a single integer

```python
def stats(data):
    return len(data)          # returns one int

count, total = stats(data)    # TypeError: cannot unpack int
```

Return a tuple when the caller expects several values:

```python
def stats(data):
    return len(data), sum(data)
```

## Cause 4: `in` on an integer

```python
if 3 in 12345:      # TypeError: argument of type 'int' is not iterable
```

Convert to a string if you meant digits: `if "3" in str(12345):`. If you meant a collection, make sure the variable actually holds one.

## Cause 5: a variable that changed type

A name that held a list was later reassigned to a number, often a counter or an accumulator:

```python
scores = [10, 20, 30]
for s in scores:
    scores = s * 2     # overwrites the list with an int
for s in scores:       # TypeError on the second loop
    ...
```

Use different names, and check with `print(type(x), x)` just before the failing line. Values read from JSON or an API may also be a number where you expected a list (e.g. `{"items": 3}` vs `{"items": [...]}`); validate with `isinstance(value, list)`.
