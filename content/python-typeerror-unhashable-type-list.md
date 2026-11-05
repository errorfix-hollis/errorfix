---
error: "TypeError: unhashable type: 'list'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 3, in <module>
      seen = {[1, 2], [3, 4]}
  TypeError: unhashable type: 'list'
cat: python
description: You used a mutable object (list, dict or set) as a dictionary key, a set member, or in something that needs hashing, like pandas groupby or drop_duplicates. Convert it to an immutable type such as a tuple or frozenset.
tldr: "Convert the list to a tuple before using it as a key or set member: `d[tuple(key)] = value`, `set(map(tuple, rows))`. For dicts use `frozenset(d.items())` or `json.dumps(d, sort_keys=True)`. In pandas, convert list columns first: `df['col'] = df['col'].apply(tuple)`."
keywords: python typeerror unhashable type list dict set dictionary key set member tuple frozenset pandas drop_duplicates groupby hashable
related: [python-keyerror, python-typeerror-int-object-is-not-subscriptable, python-runtimeerror-dictionary-changed-size-during-iteration]
---
## What it means

Dictionary keys and set members must be *hashable*: their hash must never change. Lists, dicts and sets are mutable, so Python refuses to hash them. The same error appears as `unhashable type: 'dict'`, `unhashable type: 'set'`, `unhashable type: 'numpy.ndarray'` or `unhashable type: 'Series'`.

Typical triggers:

```python
d = {}
d[[1, 2]] = "x"           # list as dict key
s = {[1, 2]}              # list inside a set
set([[1, 2], [1, 2]])     # deduplicating a list of lists
[1, 2] in {"a": 1}        # membership test against a dict/set
```

## Cause 1: a list used as a dict key or set member

Use a tuple. Tuples are hashable as long as everything inside them is hashable.

```python
d[tuple(key)] = value

rows = [[1, 2], [1, 2], [3, 4]]
unique = set(map(tuple, rows))            # {(1, 2), (3, 4)}
unique_lists = [list(t) for t in unique]
```

To deduplicate while keeping order:

```python
unique = list(dict.fromkeys(map(tuple, rows)))
```

## Cause 2: a dict used as a key or deduplicated

For a flat dict, `frozenset(d.items())` is hashable. For nested dicts, serialize to a canonical string:

```python
import json
records = [{"a": 1}, {"a": 1}, {"b": 2}]
seen, out = set(), []
for r in records:
    k = json.dumps(r, sort_keys=True)
    if k not in seen:
        seen.add(k)
        out.append(r)
```

## Cause 3: a set inside a set

Use `frozenset`:

```python
groups = {frozenset({1, 2}), frozenset({3})}
```

## Cause 4: pandas columns containing lists

`df.drop_duplicates()`, `df.groupby('col')`, `value_counts()` and `set(df['col'])` all hash values. If a column holds lists (common after `json_normalize` or `str.split`), convert them:

```python
df["tags"] = df["tags"].apply(tuple)
df = df.drop_duplicates()
```

Or only deduplicate on hashable columns: `df.drop_duplicates(subset=["id", "name"])`.

Passing a list where pandas expects a single label can also trigger it, e.g. `df.groupby(df[["a", "b"]])` — use `df.groupby(["a", "b"])`.

## Cause 5: lru_cache / functools.cache with list arguments

`@functools.lru_cache` hashes the arguments. Pass a tuple instead of a list, or convert inside a wrapper:

```python
from functools import lru_cache

@lru_cache
def total(values: tuple) -> int:
    return sum(values)

total(tuple(my_list))
```

## Cause 6: custom classes with `__eq__` but no `__hash__`

Defining `__eq__` sets `__hash__` to `None`, so instances raise `unhashable type: 'MyClass'`. Add a `__hash__` based on immutable fields, or use `@dataclass(frozen=True)`, which generates one:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Point:
    x: int
    y: int

{Point(1, 2)}   # works
```
