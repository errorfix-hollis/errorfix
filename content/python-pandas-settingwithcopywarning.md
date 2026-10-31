---
error: "SettingWithCopyWarning: A value is trying to be set on a copy of a slice from a DataFrame"
error_full: |
  SettingWithCopyWarning:
  A value is trying to be set on a copy of a slice from a DataFrame.
  Try using .loc[row_indexer,col_indexer] = value instead

  See the caveats in the documentation: https://pandas.pydata.org/pandas-docs/stable/user_guide/indexing.html#returning-a-view-versus-a-copy
cat: python
description: pandas warns that you're assigning to something that may be a temporary copy of a DataFrame, so the change might not reach the original. Caused by chained indexing like df[mask]['col'] = x, or by modifying a filtered subset.
tldr: "Assign in one step with `.loc`: `df.loc[df['age'] > 30, 'group'] = 'senior'`. When you want an independent subset, make it explicit: `sub = df[df['age'] > 30].copy()` and then modify `sub`. Since pandas 2.x you can also enable copy-on-write: `pd.options.mode.copy_on_write = True`."
keywords: pandas settingwithcopywarning a value is trying to be set on a copy of a slice from a dataframe loc copy chained assignment copy on write
related: [python-keyerror, python-typeerror-unsupported-operand-types, python-valueerror-too-many-values-to-unpack]
---
## What it means

Indexing a DataFrame sometimes returns a *view* (shares memory with the original) and sometimes a *copy*. pandas can't always tell which you got, so when you assign into the result it warns: your assignment may silently do nothing to the original `df`. Treat it as a bug signal, not noise.

## Cause 1: chained indexing

Two indexing operations in a row, then an assignment:

```python
# Wrong: df[df.age > 30] creates a new object; ['group'] = ... modifies that object
df[df['age'] > 30]['group'] = 'senior'
```

Use a single `.loc` call with row and column selectors:

```python
df.loc[df['age'] > 30, 'group'] = 'senior'
```

Same for single cells: `df.loc[5, 'price'] = 9.99` (or `df.at[5, 'price'] = 9.99`) instead of `df['price'][5] = 9.99`.

## Cause 2: modifying a filtered subset

```python
adults = df[df['age'] >= 18]
adults['score'] = adults['score'] * 2      # warning
```

If `adults` should be a separate table, say so:

```python
adults = df[df['age'] >= 18].copy()
adults['score'] = adults['score'] * 2      # fine, df is untouched
```

If you meant to change `df` itself, use `.loc` on `df`:

```python
mask = df['age'] >= 18
df.loc[mask, 'score'] = df.loc[mask, 'score'] * 2
```

## Cause 3: column subsets and functions

```python
sub = df[['name', 'price']]
sub['price'] = sub['price'].round(2)       # warning
```

Fix with `.copy()` or by building new columns with `assign`, which always returns a new DataFrame:

```python
sub = df[['name', 'price']].assign(price=lambda d: d['price'].round(2))
```

Functions that receive a slice and modify it in place trigger it too; return a new frame from the function instead.

## Fix 4: enable copy-on-write (pandas 2.x)

Copy-on-write makes every indexing result behave like a copy, so the rules become simple and the warning goes away. Chained assignment then never modifies the original (it raises `ChainedAssignmentError` warnings instead), so you must use `.loc`.

```python
import pandas as pd
pd.options.mode.copy_on_write = True
```

Copy-on-write is the default behaviour in pandas 3.0.

## Don't just silence it

```python
pd.options.mode.chained_assignment = None   # hides the warning
```

This hides it, but your assignments may still be lost. Only do this after you've verified the code is correct.

## Check your pandas version

```bash
python -c "import pandas; print(pandas.__version__)"
```
