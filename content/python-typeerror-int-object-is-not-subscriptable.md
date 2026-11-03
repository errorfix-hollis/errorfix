---
error: "TypeError: 'int' object is not subscriptable"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 3, in <module>
      print(n[0])
  TypeError: 'int' object is not subscriptable
cat: python
description: You used square brackets on an integer, as if it were a list, string or dict. The variable holds a number where you expected a container.
tldr: "Find where the variable became an `int` (`print(type(x))`). To get digits use `str(n)[0]` or `int(str(n)[0])`; don't reuse a list's name for a counter; and check functions return the container, not a count."
keywords: python typeerror int object is not subscriptable integer index digits list overwritten variable shadowing float object is not subscriptable
related: [python-typeerror-nonetype-object-is-not-subscriptable, python-typeerror-string-indices-must-be-integers, python-indexerror-list-index-out-of-range]
---
## What it means

"Subscriptable" means "supports `x[...]`". Lists, tuples, strings and dicts are subscriptable; `int`, `float`, `bool` and `None` are not. Python raises this when the object before `[` is an `int`. The same applies to `'float' object is not subscriptable`.

Start by checking what the value really is:

```python
print(type(x), x)
```

## Cause 1: you want a digit of a number

```python
n = 2026
first = n[0]        # TypeError
```

Convert to a string first:

```python
first = str(n)[0]             # '2'
first_digit = int(str(n)[0])  # 2
digits = [int(d) for d in str(n)]   # [2, 0, 2, 6]
```

Or use arithmetic: `last = n % 10`, `first = n // 10 ** (len(str(n)) - 1)`.

## Cause 2: a variable got overwritten with a number

```python
scores = [90, 85, 70]
for scores in range(3):      # reuses the name!
    pass
print(scores[0])             # scores is now 2
```

Or with `sum`/`len`:

```python
items = [3, 4]
items = len(items)
items[0]                     # TypeError
```

Fix: use distinct names (`for i in range(...)`, `count = len(items)`).

## Cause 3: function returns a number, not a list

```python
def get_ids():
    ids = [1, 2, 3]
    return len(ids)          # oops

get_ids()[0]                 # TypeError
```

Check the `return` statement. Methods like `list.count()`, `str.find()`, `cursor.rowcount` and `dict.get(key, 0)` return integers, too.

## Cause 4: nested data is shallower than you think

```python
data = {"user": {"id": 7}}
data["user"]["id"][0]        # 'int' object is not subscriptable
```

Print the intermediate value (`print(data["user"])`) or use `json.dumps(data, indent=2)` to see the real structure.

## Cause 5: a 2D list that is really 1D

```python
grid = [0] * 5
grid[1][2] = 9               # grid[1] is the int 0
```

Build a real 2D list:

```python
grid = [[0] * 5 for _ in range(5)]
grid[1][2] = 9
```

(Don't use `[[0] * 5] * 5` — that creates five references to the same row.)

## Cause 6: pandas/numpy scalars

`df["col"].sum()`, `df.shape[0]` and `arr.max()` return scalars. Indexing them again (`df.shape[0][0]`) raises this error, sometimes with `'numpy.int64' object is not subscriptable`. Drop the extra index.
