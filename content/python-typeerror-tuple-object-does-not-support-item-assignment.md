---
error: "TypeError: 'tuple' object does not support item assignment"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 3, in <module>
      point[0] = 10
      ~~~~~^^^
  TypeError: 'tuple' object does not support item assignment
cat: python
description: "Tuples are immutable, so you can't change, add or remove their elements with `t[i] = value`. Convert to a list, build a new tuple, or use a mutable type."
tldr: "Convert to a list, change it, and convert back if needed: `lst = list(t); lst[0] = 10; t = tuple(lst)`. Or build a new tuple: `t = (10,) + t[1:]`. For named records use `namedtuple._replace()` or a dataclass. Watch for accidental tuples from trailing commas (`x = 1, 2`)."
keywords: python typeerror tuple object does not support item assignment immutable tuple convert to list namedtuple _replace trailing comma
related: [python-typeerror-str-object-does-not-support-item-assignment, python-typeerror-int-object-is-not-subscriptable, python-indexerror-list-index-out-of-range]
---
## What it means

A `tuple` is immutable: after it is created its elements can't be replaced. `t[0] = x`, `t[1] += 1` and `del t[0]` all raise this error. Lists support all of these.

```python
point = (3, 4)
point[0] = 10   # TypeError
```

## Fix 1: use a list if the data should change

If you control where the value is created, make it a list from the start:

```python
point = [3, 4]
point[0] = 10
```

Or convert, modify, convert back:

```python
lst = list(point)
lst[0] = 10
point = tuple(lst)
```

## Fix 2: build a new tuple

For a one-off change, create a new tuple with slicing:

```python
point = (10,) + point[1:]          # replace first element
t = t[:i] + (new_value,) + t[i+1:] # replace element i
```

Note the comma in `(10,)` — `(10)` is just the integer 10.

## Fix 3: tuples you didn't create on purpose

Several APIs return tuples that people assume are lists:

- **Database rows**: `cursor.fetchone()` / `fetchall()` in sqlite3, psycopg2 and MySQL connectors return tuples. Convert with `list(row)` (or `dict(row)` when using `sqlite3.Row`) before modifying.
- **`*args`** inside a function is a tuple: `args = list(args)` before modifying.
- **`zip()`** yields tuples: `[list(p) for p in zip(a, b)]`.
- **NumPy `.shape`** is a tuple; use `arr.reshape(...)` instead of editing the shape.
- **`dict.items()`** yields `(key, value)` tuples — assign to `d[key]` instead.

```python
for k, v in d.items():
    d[k] = v * 2        # correct: modify the dict, not the tuple
```

## Fix 4: accidental tuple from a trailing comma

A trailing comma creates a tuple silently:

```python
x = 1, 2, 3            # a tuple, not a list
x[0] = 0               # TypeError

values = sorted(data), # trailing comma: a 1-element tuple
values[0] = []         # TypeError
```

Remove the comma. `print(type(x))` quickly confirms what you have.

## Fix 5: named tuples and records

`namedtuple` is also immutable. Use `_replace`, which returns a new instance:

```python
from collections import namedtuple
Point = namedtuple("Point", "x y")
p = Point(3, 4)
p = p._replace(x=10)
```

If you need mutable fields, switch to a dataclass:

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int

p = Point(3, 4)
p.x = 10
```

## Note: mutable items inside a tuple

A tuple can contain mutable objects, and those *can* change: `t = ([1], 2); t[0].append(5)` works. But `t[0] += [5]` raises this error (and still mutates the list), because `+=` tries to reassign `t[0]` afterwards. Use `t[0].extend([5])` instead.
