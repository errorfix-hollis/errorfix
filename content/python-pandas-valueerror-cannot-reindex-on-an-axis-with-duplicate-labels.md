---
error: "ValueError: cannot reindex on an axis with duplicate labels"
error_full: |
  Traceback (most recent call last):
    File "report.py", line 12, in <module>
      df["total"] = other["total"]
  ValueError: cannot reindex on an axis with duplicate labels
cat: python
description: "pandas had to align two objects by index (or by columns) and one side has repeated labels, so the match is ambiguous. Older pandas says cannot reindex from a duplicate axis."
tldr: "Find the duplicates with `df.index[df.index.duplicated()]` (or `df.columns[df.columns.duplicated()]`). Then drop them (`df = df[~df.index.duplicated(keep='first')]`), reset the index (`df.reset_index(drop=True)`), or assign by position instead of label (`df['total'] = other['total'].to_numpy()`)."
keywords: pandas valueerror cannot reindex on an axis with duplicate labels cannot reindex from a duplicate axis duplicated index reset_index concat assign column to_numpy duplicate columns
related: [python-pandas-settingwithcopywarning, python-pandas-truth-value-of-a-series-is-ambiguous, python-keyerror]
---
## What it means

Many pandas operations *align by label*. If you assign a Series to a column, add two frames, `reindex`, or `concat(axis=1)`, pandas matches rows by index value. If an index has the same label twice, pandas can't decide which row goes where, so it raises this error. pandas before 1.3 had different wording: `cannot reindex from a duplicate axis`.

Find the duplicates:

```python
print(df.index.is_unique)
print(df.index[df.index.duplicated(keep=False)])      # duplicated row labels
print(df.columns[df.columns.duplicated()])            # duplicated column names
```

Check both objects in the failing line. Either side can have the duplicates.

## Cause 1: assigning a column from another frame

```python
df["total"] = other["total"]     # aligns on index; fails if either index has duplicates
```

If the rows are already in the same order, assign by position:

```python
df["total"] = other["total"].to_numpy()     # lengths must match
```

If they should be matched by a key, use `merge` on that key column instead of relying on the index:

```python
df = df.merge(other[["id", "total"]], on="id", how="left")
```

## Cause 2: the index has duplicates from concat or set_index

`pd.concat([a, b])` keeps both frames' indexes, so you get 0, 1, 2, 0, 1, 2. `set_index("date")` on data with repeated dates does the same.

```python
df = pd.concat([a, b], ignore_index=True)      # fresh 0..n-1 index
df = df.reset_index(drop=True)                 # or reset afterwards
```

If the duplicates are real duplicate records, drop them:

```python
df = df[~df.index.duplicated(keep="first")]
# or, for full duplicate rows
df = df.drop_duplicates()
```

## Cause 3: duplicate column names

Reading a CSV with two columns of the same name, or `concat(axis=1)` of frames that share column names, gives duplicate columns. Assigning to those columns or reindexing them then fails.

```python
df = df.loc[:, ~df.columns.duplicated()]        # keep first of each name
# or rename them
df.columns = [f"{c}_{i}" if dup else c
              for i, (c, dup) in enumerate(zip(df.columns, df.columns.duplicated()))]
```

`pd.read_csv` normally renames repeated headers to `name.1`, `name.2`. Duplicates usually come from code that sets `df.columns` or concatenates.

## Cause 4: `reindex` / `asfreq` / `resample` on time series

`df.reindex(new_index)` and `df.asfreq("D")` require a unique index. Aggregate the duplicate timestamps first:

```python
df = df.groupby(level=0).mean()        # or .sum(), .last()
df = df.asfreq("D")
```

## Cause 5: `groupby().apply()` returning misaligned results

If a function in `groupby(...).apply(...)` returns objects whose indexes overlap, assigning the result back can trigger this. Use `transform` for same-length results:

```python
df["share"] = df.groupby("team")["points"].transform(lambda s: s / s.sum())
```

## Prevent it

When the index should be unique, enforce it so the error appears where the duplicate is created:

```python
df = df.set_index("id", verify_integrity=True)
df = df.set_flags(allows_duplicate_labels=False)   # pandas 1.2+, experimental
```
