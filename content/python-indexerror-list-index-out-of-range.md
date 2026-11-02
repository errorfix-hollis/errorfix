---
error: "IndexError: list index out of range"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 3, in <module>
      print(items[3])
  IndexError: list index out of range
cat: python
description: You accessed a list position that doesn't exist. Lists are zero-indexed, so a list of length n has valid indexes 0 to n-1 (and -1 to -n). Often the list is empty or shorter than you assumed.
tldr: "Print `len(items)` and the index right before the failing line. Use `range(len(items))` (not `len + 1`), iterate directly with `for x in items`, check `if items:` before `items[0]`, and use `sys.argv` / `split()` results only after checking their length."
keywords: python indexerror list index out of range zero indexed len empty list sys.argv split loop off by one pop from empty list string index out of range tuple
related: [python-keyerror, python-typeerror-nonetype-object-is-not-subscriptable, python-valueerror-too-many-values-to-unpack]
---
## What it means

For `items = ["a", "b", "c"]`, valid indexes are `0`, `1`, `2` and `-1`, `-2`, `-3`. `items[3]` or `items[-4]` raises `IndexError`. Related messages: `string index out of range`, `tuple index out of range`, `pop from empty list`.

Debug by printing just before the line:

```python
print(len(items), i, items)
```

Note that **slices never raise**: `items[5:10]` returns `[]`.

## Cause 1: off-by-one in a loop

```python
for i in range(len(items) + 1):   # goes one past the end
    print(items[i])

for i in range(1, len(items) + 1):  # 1-based thinking
    print(items[i])
```

Prefer iterating directly; use `enumerate` if you need the index:

```python
for item in items:
    print(item)

for i, item in enumerate(items):
    print(i, item)
```

Comparing neighbours? Stop one early:

```python
for i in range(len(items) - 1):
    if items[i] > items[i + 1]: ...
```

Or `for a, b in zip(items, items[1:]):`.

## Cause 2: the list is empty

`items[0]` or `items[-1]` on `[]` fails. Common with filtered results, API responses and database queries.

```python
if items:
    first = items[0]
else:
    first = None

# or
first = items[0] if items else None
first = next(iter(items), None)
```

## Cause 3: `sys.argv` without arguments

```python
import sys
filename = sys.argv[1]   # IndexError when run as: python script.py
```

`sys.argv[0]` is the script name. Check the length, or use `argparse`, which prints a usage message instead:

```python
if len(sys.argv) < 2:
    sys.exit("usage: script.py FILE")
```

## Cause 4: `split()` returned fewer parts

```python
line = "alice"
name, age = line.split(",")[0], line.split(",")[1]   # IndexError
```

Lines in CSV or log files may be blank or malformed — especially a trailing empty line. Guard it:

```python
parts = line.strip().split(",")
if len(parts) < 2:
    continue
```

Use the `csv` module for real CSV files, and `str.partition(",")` when you want exactly two parts without errors.

## Cause 5: modifying a list while iterating by index

```python
for i in range(len(items)):
    if items[i] < 0:
        items.pop(i)        # list shrinks; later i is out of range
```

Build a new list instead:

```python
items = [x for x in items if x >= 0]
```

## Cause 6: nested lists / 2D grids

`grid[row][col]` fails if rows have different lengths or you swapped row and column. Use `len(grid)` for rows and `len(grid[row])` for that row's columns. When creating grids, use `[[0] * cols for _ in range(rows)]`.

## Cause 7: NumPy / pandas

`IndexError: index 5 is out of bounds for axis 0 with size 5` is the NumPy equivalent. In pandas, `df.iloc[n]` raises `IndexError: single positional indexer is out-of-bounds`; check `len(df)` or `df.empty` first.
