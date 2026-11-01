---
error: "ValueError: The truth value of a Series is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all()."
error_full: |
  ValueError: The truth value of a Series is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all().
  ValueError: The truth value of a DataFrame is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all().
  ValueError: The truth value of an array with more than one element is ambiguous. Use a.any() or a.all()
cat: python
description: Python needs a single True/False, but you gave it a whole pandas Series (or NumPy array) of booleans, usually by using and/or/not or an if statement on a column.
tldr: "In filters use `&`, `|`, `~` with parentheses instead of `and`, `or`, `not`: `df[(df.a > 1) & (df.b < 5)]`. In `if` statements reduce to one value: `if (df.a > 1).any():` or `.all()`, `if df.empty:`. For row-wise logic use `np.where` or `.apply`, not `if`."
keywords: pandas valueerror truth value of a series is ambiguous use a.empty a.bool a.item a.any a.all dataframe numpy array more than one element and or bitwise
related: [python-pandas-settingwithcopywarning, python-keyerror, python-typeerror-unsupported-operand-types]
---
## What it means

A comparison like `df["age"] > 30` returns a Series of booleans, one per row. Python's `and`, `or`, `not`, `if` and `while` call `bool()` on their operand, and pandas refuses to guess whether a Series of many values is "true" (any row? all rows? non-empty?). So it raises this error and lists the ways to say what you mean.

## Cause 1: `and` / `or` in a filter

```python
# Wrong
df[df["age"] > 30 and df["city"] == "Paris"]

# Right: element-wise operators, each condition in parentheses
df[(df["age"] > 30) & (df["city"] == "Paris")]
df[(df["age"] > 30) | (df["vip"] == True)]
df[~(df["status"] == "closed")]
```

The parentheses are required: `&` and `|` bind tighter than `>` and `==`, so `df.a > 1 & df.b < 5` is parsed wrongly and also raises this error.

`df.query("age > 30 and city == 'Paris'")` is an alternative where `and`/`or` are allowed.

## Cause 2: `if` on a Series

```python
# Wrong
if df["score"] > 50:
    ...

# Decide what you mean
if (df["score"] > 50).any():   # at least one row
    ...
if (df["score"] > 50).all():   # every row
    ...
if df.empty:                   # no rows at all
    ...
```

If you expect exactly one row, use `.item()`, which raises if there isn't exactly one element:

```python
if (df.loc[df.id == 7, "score"] > 50).item():
    ...
```

## Cause 3: row-by-row logic written as an `if`

Writing a function with `if` and passing whole columns doesn't work:

```python
def grade(score):
    if score > 50:          # score is a Series here -> error
        return "pass"
    return "fail"

df["grade"] = grade(df["score"])
```

Vectorise it:

```python
import numpy as np
df["grade"] = np.where(df["score"] > 50, "pass", "fail")

# several conditions
df["band"] = np.select(
    [df.score >= 80, df.score >= 50],
    ["high", "mid"],
    default="low",
)
```

Or apply the function per value (slower, but fine for small data): `df["grade"] = df["score"].apply(grade)`.

## Cause 4: `in`, `==` or `bool()` on a Series

- `if df["name"] == "Bob":` - use `(df["name"] == "Bob").any()`.
- `"Bob" in df["name"]` checks the **index**, not values. Use `"Bob" in df["name"].values` or `df["name"].eq("Bob").any()`.
- `x or default` where `x` is a Series - use `x if x is not None else default`.

## Cause 5: NumPy arrays

The NumPy version (`truth value of an array with more than one element is ambiguous`) has the same fixes: `np.logical_and(a > 1, b < 5)` or `(a > 1) & (b < 5)`, and `.any()` / `.all()` in conditions.

Note: `Series.bool()` mentioned in the message is deprecated since pandas 2.1; use `.item()` instead.
