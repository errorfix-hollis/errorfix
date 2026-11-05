---
error: "ValueError: setting an array element with a sequence."
error_full: |
  Traceback (most recent call last):
    File "app.py", line 4, in <module>
      arr = np.array([[1, 2, 3], [4, 5]], dtype=float)
  ValueError: setting an array element with a sequence. The requested array has an inhomogeneous shape after 1 dimensions. The detected shape was (2,) + inhomogeneous part.
cat: python
description: NumPy tried to put a list (or array) into a single numeric slot. Usually your nested lists have different lengths (a ragged array), or you assigned a sequence to one element of an array.
tldr: "Check the lengths: `print({len(r) for r in rows})`. Pad or truncate rows to equal length (or use `dtype=object` if you really want ragged data). When assigning, match shapes: `arr[i, :] = row` instead of `arr[i] = [row, extra]`. For pandas columns of lists, use `np.stack(df['col'].to_numpy())`."
keywords: numpy valueerror setting an array element with a sequence inhomogeneous shape ragged nested sequences np.array dtype object pandas column of lists sklearn
related: [python-valueerror-could-not-convert-string-to-float, python-indexerror-list-index-out-of-range, python-typeerror-unsupported-operand-types]
---
## What it means

A NumPy array with a numeric dtype holds exactly one number per element, and all rows must have the same length. If NumPy finds a nested list where it expects a scalar, it raises this error. NumPy 1.24+ adds `The requested array has an inhomogeneous shape after N dimensions`, which tells you the depth at which lengths stopped matching.

## Cause 1: ragged nested lists

```python
rows = [[1, 2, 3], [4, 5]]
np.array(rows)                 # ValueError (NumPy >= 1.24)
```

Find the bad rows:

```python
from collections import Counter
print(Counter(len(r) for r in rows))
print([i for i, r in enumerate(rows) if len(r) != 3])
```

Fix by padding to a fixed length:

```python
width = max(len(r) for r in rows)
arr = np.array([r + [0] * (width - len(r)) for r in rows], dtype=float)
```

Or, for variable-length sequences that you won't do math on, keep them as objects:

```python
arr = np.empty(len(rows), dtype=object)
arr[:] = rows
```

In older NumPy (< 1.24) ragged input silently became `dtype=object` with a `VisibleDeprecationWarning`; code that "worked" before may fail after an upgrade for this reason.

## Cause 2: assigning a sequence to a single element

```python
a = np.zeros(3)
a[0] = [1, 2]                  # one slot, two values
```

Assign to a slice of matching shape, or make the array 2-D:

```python
a = np.zeros((3, 2))
a[0] = [1, 2]                  # row 0 now [1., 2.]
```

## Cause 3: pandas column containing lists or arrays

Feeding `df["embedding"]` (each cell a list) into scikit-learn, `np.array(df.values, dtype=float)` or `df.astype(float)` triggers it. Stack the cells into a 2-D array:

```python
X = np.stack(df["embedding"].to_numpy())          # all cells same length
# or expand into columns
emb = pd.DataFrame(df["embedding"].tolist(), index=df.index)
```

If the cells are strings like `"[0.1, 0.2]"` (after a CSV round-trip), parse them first: `df["embedding"].apply(json.loads)`.

## Cause 4: mixing scalars and arrays

```python
np.array([1.0, np.array([2.0, 3.0])], dtype=float)  # ValueError
```

Flatten first: `np.concatenate([[1.0], np.array([2.0, 3.0])])` or `np.hstack(...)`.

## Cause 5: functions returning different shapes

When building arrays in a loop, one iteration may return a shorter result (e.g. an empty list on error). Assert shape as you go:

```python
features = []
for item in items:
    f = extract(item)
    assert len(f) == 128, (item, len(f))
    features.append(f)
X = np.array(features)
```

Better still, preallocate: `X = np.zeros((len(items), 128))` and fill `X[i] = extract(item)`; the bad row raises immediately with a clear broadcast error.
