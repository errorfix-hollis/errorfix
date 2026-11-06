---
error: "TypeError: 'float' object is not iterable"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 4, in <module>
      for x in total:
  TypeError: 'float' object is not iterable
cat: python
description: Python tried to loop over, unpack or call sum()/list()/max() on a single float. You meant to iterate over a list (or a range) but have one number.
tldr: "Loop over the collection, not the number: `for i in range(int(n))` or `for x in values`. For `sum(a, b)`/`max(x)` pass a list: `sum([a, b])`. Check `type(x)` — a pandas column with NaN or a function that returns a single float is a common source."
keywords: python typeerror float object is not iterable for loop sum max min list unpack pandas nan apply range
related: [python-typeerror-nonetype-object-is-not-iterable, python-typeerror-float-object-cannot-be-interpreted-as-an-integer, python-valueerror-too-many-values-to-unpack]
---
## What it means

Iterating means asking an object for its items one by one. Lists, tuples, strings, dicts, sets, ranges and generators can do that; a `float` is a single number and can't. Anything that iterates implicitly raises this error when given a float:

- `for x in value:`
- `a, b = value` (unpacking)
- `list(value)`, `tuple(value)`, `set(value)`
- `sum(value)`, `max(value)`, `min(value)`, `sorted(value)`
- `x in value`, `"".join(value)`, `zip(value, ...)`

## Cause 1: looping over a number instead of a range

```python
n = 5.0
for i in n:            # TypeError
    ...
```

Fix: wrap the count in `range()`, which also needs an int:

```python
for i in range(int(n)):
    ...
```

## Cause 2: `sum()`, `max()`, `min()` called with separate numbers

`sum()` takes an iterable, not several arguments:

```python
sum(3.5, 2.0)          # TypeError: 'float' object is not iterable
sum([3.5, 2.0])        # 5.5
```

`max()`/`min()` accept either several arguments or one iterable — but not one float:

```python
max(3.5)               # TypeError
max(3.5, 2.0)          # 3.5
max([3.5])             # 3.5
```

## Cause 3: a variable was overwritten with a float

Common when an accumulator reuses the name of the list:

```python
prices = [9.99, 4.50, 3.25]
for prices in prices:   # after the loop, prices is 3.25
    ...
total = sum(prices)     # TypeError
```

Use distinct names: `for price in prices:`.

Same thing when a function sometimes returns a list and sometimes a single float. Make it always return a list (`return [value]`).

## Cause 4: unpacking a single value

```python
lat, lon = get_location()   # returns 52.37 instead of (52.37, 4.89)
```

Fix the function to return a tuple, or check what it actually returns with `print(repr(get_location()))`.

## Cause 5: pandas — NaN is a float

Missing values in pandas are `float('nan')`. If a column holds lists or strings and some rows are missing, an `apply` that iterates over each cell blows up on the NaN rows:

```python
df["tags"].apply(lambda tags: ", ".join(tags))   # TypeError on NaN rows
```

Handle the missing case:

```python
df["tags"].apply(lambda t: ", ".join(t) if isinstance(t, list) else "")
# or drop / fill first
df["tags"] = df["tags"].apply(lambda t: t if isinstance(t, list) else [])
```

Also watch for `for x in df["price"].sum():` — `.sum()` returns a single float.

## Cause 6: wrong JSON shape

`data["score"]` might be `4.5` in one response and `[4.5, 3.0]` in another. Normalise it:

```python
scores = data["score"]
if not isinstance(scores, (list, tuple)):
    scores = [scores]
```

## Debugging

Print the type just before the failing line:

```python
print(type(value), repr(value))
```

Then trace where that variable was last assigned. The fix is almost always to pass the list that holds the float, not the float itself.
