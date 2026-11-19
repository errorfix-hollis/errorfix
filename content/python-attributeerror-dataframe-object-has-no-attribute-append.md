---
error: "AttributeError: 'DataFrame' object has no attribute 'append'"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 8, in <module>
      df = df.append({"name": "Ann", "age": 31}, ignore_index=True)
    File ".../pandas/core/generic.py", line 6299, in __getattr__
      return object.__getattribute__(self, name)
  AttributeError: 'DataFrame' object has no attribute 'append'. Did you mean: '_append'?
cat: python
description: "`DataFrame.append()` and `Series.append()` were deprecated in pandas 1.4 and removed in pandas 2.0. Code and tutorials written for older pandas fail after upgrading."
tldr: "Use `pd.concat`: `df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)`. Better, collect rows in a list and build once: `df = pd.DataFrame(rows)`. For one row with a default index, `df.loc[len(df)] = row` works too. Don't use the private `_append`."
keywords: attributeerror dataframe object has no attribute append pandas 2.0 removed deprecated pd.concat series append did you mean _append add row to dataframe loop ignore_index
related: [python-modulenotfounderror-no-module-named-pandas, python-pandas-settingwithcopywarning, python-attributeerror-module-has-no-attribute]
---
## What it means

pandas 2.0 (April 2023) removed `DataFrame.append` and `Series.append`. Check your version:

```bash
python -c "import pandas; print(pandas.__version__)"
```

`append` was removed partly because it was slow: each call copies the whole DataFrame, so appending in a loop is quadratic. The replacements below are both correct and faster.

The `Did you mean: '_append'?` hint points to a private method — it may change or disappear, so don't rely on it.

## Fix 1: pd.concat for joining DataFrames

```python
import pandas as pd

# Old
df = df1.append(df2, ignore_index=True)
# New
df = pd.concat([df1, df2], ignore_index=True)
```

Appending a single row (a dict) means wrapping it in a one-row DataFrame:

```python
row = {"name": "Ann", "age": 31}
df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
```

Note the brackets: `pd.DataFrame([row])` (list of dicts → one row). `pd.DataFrame(row)` with scalar values raises `If using all scalar values, you must pass an index`.

For Series: `s = pd.concat([s, pd.Series([value])], ignore_index=True)`.

## Fix 2: build the list first, DataFrame once (best for loops)

```python
rows = []
for item in items:
    rows.append({"name": item.name, "age": item.age})   # list.append is fine
df = pd.DataFrame(rows)
```

This is much faster than concatenating inside the loop. If you're producing DataFrames in a loop, collect them and concat once:

```python
frames = [pd.read_csv(f) for f in files]
df = pd.concat(frames, ignore_index=True)
```

## Fix 3: df.loc for a single row

With a default `RangeIndex`, you can assign a new row by label:

```python
df.loc[len(df)] = ["Ann", 31]               # values in column order
df.loc[len(df)] = {"name": "Ann", "age": 31}
```

This modifies `df` in place. It only works as "append" when the index is `0..n-1` — otherwise `len(df)` may overwrite an existing label.

## Watch out for dtypes and empty frames

- Concatenating with an empty or all-NA DataFrame raised a `FutureWarning` in pandas 2.1+ about dtype determination. Start with a list (Fix 2) instead of an empty DataFrame to avoid it.
- Columns missing from one side become `NaN`, which can turn integer columns into floats. Use `astype` afterwards or the nullable `Int64` dtype.

## Pinning an old pandas (temporary)

If you can't change the code right now (e.g. a third-party script):

```bash
python -m pip install "pandas<2"
```

pandas 1.5 still has `append` with a deprecation warning, but it doesn't support the newest Python versions — treat this as a stopgap and port the code.
