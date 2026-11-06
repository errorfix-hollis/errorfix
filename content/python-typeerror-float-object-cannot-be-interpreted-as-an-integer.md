---
error: "TypeError: 'float' object cannot be interpreted as an integer"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 3, in <module>
      for i in range(n / 2):
  TypeError: 'float' object cannot be interpreted as an integer
cat: python
description: You passed a float where Python needs a real integer, most often to range(). In Python 3 the / operator always returns a float, even for 10 / 2.
tldr: "Use integer division `//` instead of `/` (`range(n // 2)`), or convert explicitly with `int(x)`, `round(x)` or `math.ceil(x)`. For NumPy values use `int(arr.shape[0] / 2)` or `//`."
keywords: python typeerror float object cannot be interpreted as an integer range float division // int() python 3 numpy
related: [python-typeerror-unsupported-operand-types, python-valueerror-invalid-literal-for-int-with-base-10, python-typeerror-int-object-is-not-subscriptable]
---
## What it means

Some built-ins only accept integers: `range()`, `list * n`, `str * n`, `bytes(n)`, `chr()`, `hex()`, slice indices, `random.randrange()` and others. They call the object's `__index__` method, which `float` deliberately doesn't have, because `2.5` has no exact integer meaning. Even `4.0` is rejected.

```python
range(5.0)      # TypeError
"-" * 3.0       # TypeError: can't multiply sequence by non-int of type 'float'
```

## Cause 1: `/` returns a float in Python 3

In Python 2, `7 / 2` was `3`. In Python 3 it is `3.5`, and `10 / 2` is `5.0` — still a float.

```python
n = 10
for i in range(n / 2):     # range(5.0) -> TypeError
    ...
```

## Fix 1: use floor division `//`

```python
for i in range(n // 2):    # 5
    ...

mid = len(items) // 2
left, right = items[:mid], items[mid:]
```

`//` returns an `int` when both operands are ints. Note `7.0 // 2` is still `3.0` (a float), so if either side might be a float, convert explicitly.

## Fix 2: convert explicitly, choosing the rounding you want

```python
import math

int(3.7)        # 3   (truncates toward zero)
round(3.7)      # 4   (banker's rounding: round(2.5) == 2)
math.floor(3.7) # 3
math.ceil(3.2)  # 4   (e.g. number of pages)

pages = math.ceil(total_items / per_page)
for p in range(pages):
    ...
```

Pick deliberately: `int()` silently drops the fraction, which can hide off-by-one bugs.

## Cause 2: values that came from parsing or math functions

`float(input())`, `json.load()` with `10.0` in the file, `math.sqrt()`, `math.pow()` and `**` with a negative or float exponent all return floats:

```python
side = math.sqrt(area)        # 4.0, a float
for row in range(side):       # TypeError
```

Fix: `range(int(side))`, or use `math.isqrt(area)` (Python 3.8+), which returns an int.

If the value comes from user input and should be a whole number, parse it as one: `n = int(input())`.

## Cause 3: NumPy and pandas values

NumPy floats (`numpy.float64`) behave like `float` here:

```python
import numpy as np
arr = np.zeros(10)
half = arr.size / 2            # 5.0
arr[:half]                     # TypeError: slice indices must be integers
np.zeros(half)                 # TypeError: 'float' object cannot be interpreted as an integer
```

Fix with `arr.size // 2` or `int(...)`. For `np.linspace(0, 1, num)`, `num` must also be an int.

pandas columns with missing values are stored as `float64` (NaN is a float), so `df["count"].max()` may return `12.0`. Convert with `int(...)`, or use the nullable integer dtype: `df["count"] = df["count"].astype("Int64")`.

## Cause 4: `random` and `time` helpers

`random.randrange(0, 10.0)` and `random.sample(population, k=2.0)` raise the same family of errors in recent Python versions. Pass ints.

## Finding it quickly

The traceback's last line points at the call. Print the type of the suspicious argument:

```python
print(type(n), n)
```

If it says `<class 'float'>`, trace it back to the first `/`, `float()`, `math.*` call or JSON value that produced it, and fix it there rather than sprinkling `int()` everywhere.
