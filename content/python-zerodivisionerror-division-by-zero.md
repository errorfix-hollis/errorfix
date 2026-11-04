---
error: "ZeroDivisionError: division by zero"
error_full: |
  ZeroDivisionError: division by zero
  ZeroDivisionError: float division by zero
  ZeroDivisionError: integer division or modulo by zero
cat: python
description: The right-hand side of `/`, `//` or `%` was zero. Usually an empty list (len 0), a total that summed to 0, or a value that defaulted to 0.
tldr: "Check the divisor before dividing: `avg = total / count if count else 0`. For averages of possibly-empty lists use `statistics.fmean(xs) if xs else None`. In NumPy/pandas division by zero gives `inf`/`nan` instead of raising, so handle those separately."
keywords: python zerodivisionerror division by zero float division by zero integer division or modulo by zero average empty list len 0 percentage modulo
related: [python-typeerror-unsupported-operand-types, python-valueerror-could-not-convert-string-to-float, python-indexerror-list-index-out-of-range]
---
## What it means

Python raises `ZeroDivisionError` whenever you divide or take a modulo by zero:

```python
10 / 0      # ZeroDivisionError: division by zero
10.0 / 0.0  # ZeroDivisionError: float division by zero
10 // 0     # ZeroDivisionError: integer division or modulo by zero
10 % 0      # same
```

The real question is *why* the divisor is zero. The traceback shows the line; print the divisor just before it.

## Cause 1: average or percentage of an empty collection

```python
def average(xs):
    return sum(xs) / len(xs)   # crashes when xs == []
```

## Fix 1: guard the empty case explicitly

```python
def average(xs):
    return sum(xs) / len(xs) if xs else None

pct = done / total * 100 if total else 0.0
```

Decide what "no data" should mean (0, `None`, `float("nan")`) rather than hiding it. `statistics.mean([])` raises `StatisticsError` instead, which is also explicit.

## Cause 2: integer division truncated something to zero

```python
step = width // count    # 5 // 10 == 0
x = 100 / step           # ZeroDivisionError
```

Use true division (`/`) when you need fractions, or enforce a minimum: `step = max(1, width // count)`.

## Cause 3: a value defaulted to 0

Config values, dict lookups with `.get(key, 0)`, failed parsing, or a database column with 0 for "unknown":

```python
rate = config.get("rate", 0)
period = 1 / rate
```

Validate inputs where they enter the program and raise a clear error:

```python
if rate <= 0:
    raise ValueError(f"rate must be positive, got {rate!r}")
```

## Cause 4: elapsed time is zero

Measuring speed with `time.time()` over a very fast operation can give 0 elapsed seconds on some platforms. Use `time.perf_counter()` (high resolution) and still guard: `rate = n / elapsed if elapsed > 0 else float("inf")`.

## Fix: catching it

When zero is an expected, rare case, `try/except` is fine:

```python
try:
    ratio = a / b
except ZeroDivisionError:
    ratio = float("nan")
```

Avoid wrapping big blocks in `except ZeroDivisionError` — you'll hide bugs in unrelated lines.

## NumPy and pandas behave differently

They don't raise; they return `inf`, `-inf` or `nan` and NumPy prints `RuntimeWarning: divide by zero encountered`:

```python
import numpy as np
np.array([1, 2]) / np.array([0, 1])     # array([inf, 2.])

with np.errstate(divide="ignore", invalid="ignore"):
    r = np.divide(a, b, out=np.zeros_like(a, dtype=float), where=b != 0)
```

In pandas:

```python
df["ratio"] = (df["a"] / df["b"]).replace([np.inf, -np.inf], np.nan)
```

A NumPy scalar like `np.float64(1) / 0` also returns `inf` with a warning instead of raising, which can be surprising when values come from a DataFrame.

## Decimal

`decimal.Decimal(1) / 0` raises `decimal.DivisionByZero` (a subclass of `ZeroDivisionError`), so the same `except` works.
