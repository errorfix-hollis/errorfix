---
error: "ValueError: math domain error"
error_full: |
  Traceback (most recent call last):
    File "calc.py", line 4, in <module>
      print(math.sqrt(x))
  ValueError: math domain error
cat: python
description: "A math module function got an input outside the range where it is defined, such as math.sqrt() of a negative number, math.log() of zero or a negative number, or math.acos() of a value outside [-1, 1]."
tldr: "Check the argument before the call: `math.sqrt` needs x >= 0, `math.log` needs x > 0, `math.asin`/`math.acos` need -1 <= x <= 1. Clamp floating-point drift with `max(-1.0, min(1.0, x))`, or use `cmath.sqrt(x)` if you want complex results."
keywords: python valueerror math domain error math.sqrt negative math.log zero math.acos asin out of range cmath floating point clamp
related: [python-zerodivisionerror-division-by-zero, python-valueerror-could-not-convert-string-to-float]
---
## What it means

Python's `math` module works with real numbers only. When you pass a value for which the result isn't a real number (or is undefined), it raises `ValueError: math domain error` instead of returning `nan`.

Common functions and their valid input:

| Function | Valid input |
|---|---|
| `math.sqrt(x)` | `x >= 0` |
| `math.log(x)`, `math.log10(x)`, `math.log2(x)` | `x > 0` |
| `math.log(x, base)` | `x > 0`, `base > 0`, `base != 1` |
| `math.acos(x)`, `math.asin(x)` | `-1 <= x <= 1` |
| `math.acosh(x)` | `x >= 1` |
| `math.atanh(x)` | `-1 < x < 1` |
| `math.pow(x, y)` | not negative `x` with non-integer `y` |

Print the value right before the failing line to see which case you hit.

## Cause 1: square root or log of a negative number (or zero)

```python
math.sqrt(-4)   # ValueError
math.log(0)     # ValueError
```

Often the negative number comes from data, e.g. a discriminant `b*b - 4*a*c` that is negative, or a column containing zeros.

## Fix 1: guard the input or use cmath

```python
d = b*b - 4*a*c
if d < 0:
    print("no real roots")
else:
    r = math.sqrt(d)
```

If complex results are what you want, use `cmath`:

```python
import cmath
cmath.sqrt(-4)   # 2j
```

For logs of data that may contain zeros, decide explicitly: skip them, or use `math.log1p(x)` (log of `1 + x`, valid for `x > -1`).

## Cause 2: floating-point drift in acos/asin

Calculating an angle from a dot product can give `1.0000000000000002` due to rounding, which is outside `[-1, 1]`:

```python
cos_theta = dot / (norm_a * norm_b)
math.acos(cos_theta)  # ValueError when cos_theta is 1.0000000000000002
```

## Fix 2: clamp to the valid range

```python
cos_theta = max(-1.0, min(1.0, cos_theta))
angle = math.acos(cos_theta)
```

## Cause 3: negative base with a fractional exponent

```python
math.pow(-8, 1/3)   # ValueError
```

## Fix 3: handle the sign yourself

```python
def cbrt(x):
    return math.copysign(abs(x) ** (1/3), x)
```

Python 3.11+ also has `math.cbrt(x)`, which accepts negative numbers. Note that `(-8) ** (1/3)` with the `**` operator doesn't raise; it returns a complex number, which may surprise you later.

## Cause 4: NumPy arrays vs math

`math` functions take a single number. For arrays use NumPy, which returns `nan` with a `RuntimeWarning: invalid value encountered in sqrt` instead of raising:

```python
import numpy as np
np.sqrt(np.array([4, -1]))   # array([ 2., nan])
np.sqrt(np.clip(arr, 0, None))  # clip negatives first
```

To turn those warnings into errors while debugging, use `np.seterr(invalid="raise")`.
