---
error: "ValueError: The truth value of an array with more than one element is ambiguous. Use a.any() or a.all()"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 5, in <module>
      if arr > 0:
  ValueError: The truth value of an array with more than one element is ambiguous. Use a.any() or a.all()
cat: python
description: "A NumPy array was used where Python needs a single True/False — in `if`, `while`, `and`/`or`/`not`, or a chained comparison. Comparisons on arrays are element-wise and return a boolean array, which has no single truth value."
tldr: "Say what you mean: `if (arr > 0).any():` (at least one) or `if (arr > 0).all():` (every element). Replace `and`/`or` with `&`/`|` and parentheses: `mask = (a > 0) & (a < 10)`. For per-element if/else use `np.where(arr > 0, x, y)`. To test emptiness use `arr.size > 0`."
keywords: valueerror truth value of an array with more than one element is ambiguous use a.any() or a.all() numpy if statement and or np.where boolean mask element-wise comparison np.logical_and
related: [python-pandas-truth-value-of-a-series-is-ambiguous, python-valueerror-setting-an-array-element-with-a-sequence, python-attributeerror-np-nan-was-removed-in-numpy-2]
---
## What it means

`arr > 0` doesn't return `True` or `False` — it returns an array like `array([ True, False,  True])`. Python's `if` then calls `bool()` on it, and NumPy refuses: should that be True because *some* are true, or False because *not all* are? A one-element array converts fine, which is why the bug often appears only with real data.

```python
import numpy as np
arr = np.array([1, -2, 3])
bool(arr > 0)     # ValueError
```

The pandas version of this error is `The truth value of a Series is ambiguous` and has the same fixes.

## Cause 1: array comparison in an if / while

Decide which question you're asking:

```python
if (arr > 0).any():      # at least one positive
    ...
if (arr > 0).all():      # all positive
    ...
if np.array_equal(a, b): # two arrays identical
    ...
```

`a == b` on arrays is element-wise, so `if a == b:` raises this error too — use `np.array_equal(a, b)` or `np.allclose(a, b)` for floats.

## Cause 2: `and` / `or` / `not` between arrays

`and`/`or` need single booleans. Use the element-wise operators, with parentheses because `&` binds tighter than `>`:

```python
# Wrong
mask = arr > 0 and arr < 10
# Right
mask = (arr > 0) & (arr < 10)
mask = (arr < 0) | (arr > 10)
mask = ~(arr > 0)
# equivalent functions
mask = np.logical_and(arr > 0, arr < 10)
filtered = arr[mask]
```

Chained comparisons like `0 < arr < 10` expand to `(0 < arr) and (arr < 10)`, so they fail as well — split them as above.

## Cause 3: you wanted element-wise if/else

An `if` inside a function that is called with an array:

```python
def clip_neg(x):
    if x < 0:          # fails when x is an array
        return 0
    return x
```

Vectorise instead:

```python
result = np.where(arr < 0, 0, arr)
# multiple conditions
result = np.select([arr < 0, arr > 100], [0, 100], default=arr)
```

For simple bounds, `np.clip(arr, 0, 100)` is clearer.

## Cause 4: checking whether an array is empty or None

```python
if arr:              # ambiguous for len > 1
if arr.size > 0:     # non-empty
if arr is not None:  # not None
if len(arr):         # non-empty along first axis
```

A common variant is `x = x or default` where `x` may be an array — write `x = default if x is None else x`.

## Cause 5: unexpected array from a function

Sometimes you expected a scalar but got an array, e.g. `np.where(cond)` returns a tuple of index arrays, or a model's `predict()` returns `array([0.83])`. Inspect it:

```python
print(type(val), getattr(val, 'shape', None))
```

Extract a single value with `val.item()` (fails loudly if it isn't size 1) or index it (`val[0]`).

## Cause 6: built-in `max` / `min` with arrays

Built-ins like `max(a, b)` compare with `>` internally and raise the same error for arrays. Use `np.maximum(a, b)` for element-wise maximum, or `arr.max()` for the largest element.
