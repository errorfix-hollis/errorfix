---
error: "TypeError: object of type 'int' has no len()"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 3, in <module>
      print(len(n))
  TypeError: object of type 'int' has no len()
cat: python
description: "You called len() on an integer. len() only works on sized containers such as str, list, tuple, dict and set, not on numbers."
tldr: "To count digits use `len(str(abs(n)))`. To loop N times use `range(n)` not `range(len(n))`. If you expected a list or string, find where the variable became an int (e.g. `input()` converted with `int()`, or a function returning a count) and use the original sequence."
keywords: python typeerror object of type int has no len len() integer digits range(len()) count length number
related: [python-typeerror-object-of-type-nonetype-has-no-len, python-typeerror-int-object-is-not-iterable, python-typeerror-int-object-is-not-subscriptable]
---
## What it means

`len(x)` calls `x.__len__()`. Integers have no length, so Python raises `TypeError`. The same message appears with `'float'` for floating point numbers. The fix depends on what you actually wanted.

## Cause 1: you want the number of digits

```python
n = 12345
len(n)              # TypeError
len(str(n))         # 5
len(str(abs(-42)))  # 2, ignores the minus sign
```

Without converting to a string (for positive integers):

```python
import math
digits = int(math.log10(n)) + 1 if n > 0 else 1
```

## Cause 2: `range(len(n))` where `n` is already a count

```python
count = 10
for i in range(len(count)):   # TypeError
    ...

for i in range(count):        # correct
    ...
```

`range(len(...))` is only for sequences: `for i in range(len(items))`, or better `for i, item in enumerate(items)`.

## Cause 3: the variable was overwritten with an int

A common bug is reusing a name:

```python
items = ["a", "b", "c"]
for items in range(3):   # 'items' is now an int
    pass
print(len(items))        # TypeError
```

Use different names for the loop variable and the collection. Print `type(x)` just before the failing line to see what it holds.

## Cause 4: a function returns a number, not a list

```python
result = cursor.execute("SELECT * FROM users")  # sqlite3 returns a cursor; some drivers return a row count
rows = cursor.fetchall()
print(len(rows))
```

Also `str.find()`, `list.count()`, `dict.get(key, 0)` and many API wrappers return ints. Check the documentation of the call that produced the value.

## Cause 5: `input()` converted too early

```python
pin = int(input("PIN: "))
if len(pin) != 4:          # TypeError
    ...

pin = input("PIN: ")
if len(pin) != 4 or not pin.isdigit():
    ...
pin_value = int(pin)
```

Validate the length on the string, then convert.

## Cause 6: pandas / numpy scalars

Indexing a single cell (`df.loc[0, "qty"]`, `arr[0]`) returns a scalar like `numpy.int64`, which also has no `len()`. Use the whole column/array (`len(df["qty"])`, `arr.size`) or `.shape` for dimensions.
