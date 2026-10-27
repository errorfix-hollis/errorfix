---
error: "ValueError: too many values to unpack (expected 2)"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 3, in <module>
      for key, value in data:
  ValueError: too many values to unpack (expected 2)
cat: python
description: You assigned a sequence to a fixed number of variables but it contained more items. Most often from looping over a dict without .items() or splitting a string into the wrong number of parts.
tldr: "Make the left side match the number of items. Looping over a dict? Use `for key, value in d.items():`. Splitting a string? Use `a, b = s.split(',', 1)` or `first, *rest = s.split(',')`."
keywords: python valueerror too many values to unpack expected 2 not enough values to unpack dict items split tuple unpacking
related: [python-keyerror, python-typeerror-nonetype-object-is-not-subscriptable]
---
## What it means

Unpacking like `a, b = something` requires `something` to have exactly two items. Python found more (`too many`) or fewer (`not enough values to unpack (expected 2, got 1)`).

## Cause 1: iterating over a dict directly

```python
data = {"a": 1, "b": 2}
for key, value in data:          # iterates over keys: "a", "b"
```

Each key is a string, and Python tries to unpack its characters. Use `.items()`:

```python
for key, value in data.items():
```

## Cause 2: string split produces more parts

```python
line = "name,city,country"
name, city = line.split(",")     # 3 parts
```

Options:

```python
name, city = line.split(",", 1)          # split only once
name, city, *_ = line.split(",")         # ignore the rest
name, *rest = line.split(",")            # rest is a list
```

For CSV data use the `csv` module; it handles quoted commas correctly.

## Cause 3: a function returns more than you expect

```python
def stats(xs):
    return min(xs), max(xs), sum(xs)

lo, hi = stats([1, 2, 3])        # returns 3 values
```

Print what you're unpacking to check its shape:

```python
result = stats([1, 2, 3])
print(type(result), len(result), result)
```

## Cause 4: rows with different lengths

When looping over rows (`for x, y in points:`), one malformed row breaks the loop. Find it:

```python
for i, row in enumerate(points):
    if len(row) != 2:
        print(i, row)
```

## NumPy / pandas

`for a, b in df:` iterates column names, not rows. Use `df.itertuples()` or `df.iterrows()`; for arrays check `arr.shape` before unpacking.
