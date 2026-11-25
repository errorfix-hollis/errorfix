---
error: "TypeError: unsupported format string passed to NoneType.__format__"
error_full: |
  Traceback (most recent call last):
    File "report.py", line 7, in <module>
      print(f"Total: {total:.2f}")
  TypeError: unsupported format string passed to NoneType.__format__
cat: python
description: "You applied a format spec like :.2f, :>10 or :, to a value that is None. None only supports an empty format spec, so the real bug is that the variable is None, usually a function that forgot to return."
tldr: "Find why the value is None (often a function without `return`, or `list.sort()`/`dict.get()` results). Fix the source, or guard it: `f\"{total:.2f}\" if total is not None else \"n/a\"`, or `f\"{(total or 0):.2f}\"`. The same error with `str.__format__` means the value is a string: convert with `float(x)` first."
keywords: python typeerror unsupported format string passed to nonetype __format__ f-string .2f format None function returns None str.__format__ list.__format__
related: [python-typeerror-nonetype-object-is-not-subscriptable, python-attributeerror-nonetype-object-has-no-attribute, python-valueerror-could-not-convert-string-to-float]
---
## What it means

In `f"{value:.2f}"` and `"{:.2f}".format(value)`, Python calls `value.__format__(".2f")`. `None` (and plain `object`) only accept an empty spec, so any width, precision or alignment raises this error. The message tells you the type: `NoneType` here.

```python
>>> f"{None}"        # fine: 'None'
>>> f"{None:.2f}"    # TypeError
```

So the question is: why is this variable `None`?

## Cause 1: function doesn't return anything

```python
def calc_total(items):
    total = sum(i.price for i in items)
    # forgot: return total

total = calc_total(items)
print(f"Total: {total:.2f}")   # TypeError
```

Fix: add `return total`. Every code path should return a value; check `if` branches that fall through.

## Cause 2: in-place methods return None

```python
prices = prices.sort()        # sort() returns None
avg = round(x, 2).append(...) # etc.
```

`list.sort()`, `list.append()`, `random.shuffle()`, `dict.update()` modify in place and return `None`. Use `sorted(prices)` or call the method without assigning.

## Cause 3: missing data (dict.get, DB rows, regex)

```python
price = row.get("price")        # None if key missing
m = re.search(r"\d+", s)        # None if no match
```

Guard it explicitly:

```python
price = row.get("price", 0.0)
print(f"{price:.2f}")

# or keep None but print something sensible
print(f"{price:.2f}" if price is not None else "n/a")
```

With pandas, missing values are `NaN` (a float, formats fine), but values pulled from Python objects or JSON can be `None`.

## Cause 4: formatting inside logging or tables

```python
print(f"{name:<20}{score:>6.1f}")
```

If `score` is `None` for some rows, filter or default them: `score if score is not None else float("nan")`. In `str.format` tables the same applies.

## Variant: `str.__format__` / `list.__format__`

```
ValueError: Unknown format code 'f' for object of type 'str'
TypeError: unsupported format string passed to list.__format__
```

The value is a string (e.g. from `input()` or CSV) or a list. Convert first:

```python
amount = float(input("Amount: "))
print(f"{amount:.2f}")
```

For a list, format each element: `", ".join(f"{x:.2f}" for x in values)`.

## Debugging tip

Print the type right before the failing line:

```python
print(repr(total), type(total))
```

Then follow the variable back to where it was assigned. The `:.2f` is never the bug; the `None` is.
