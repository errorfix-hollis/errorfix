---
error: "TypeError: 'dict_keys' object is not subscriptable"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 4, in <module>
      first = d.keys()[0]
  TypeError: 'dict_keys' object is not subscriptable
  TypeError: 'dict_values' object is not subscriptable
  TypeError: 'dict_items' object is not subscriptable
cat: python
description: "In Python 3, dict.keys(), .values() and .items() return view objects, not lists, so you can't index them with [0]. Convert to a list or use next(iter(...))."
tldr: "Wrap the view in `list()` before indexing: `list(d.keys())[0]`, or get the first key without building a list: `next(iter(d))`. For values use `next(iter(d.values()))`. If you only need to check membership, use `key in d` instead of indexing."
keywords: python typeerror dict_keys object is not subscriptable dict_values dict_items keys()[0] python 3 view object list first key next iter
related: [python-typeerror-int-object-is-not-subscriptable, python-typeerror-nonetype-object-is-not-subscriptable, python-attributeerror-dict-object-has-no-attribute-iteritems]
---
## What it means

In Python 2, `d.keys()` returned a list. In Python 3 it returns a **view** (`dict_keys`), a live, set-like window onto the dictionary. Views support iteration, `len()`, `in`, and set operations (`&`, `|`, `-`), but **not indexing or slicing**. So code like this fails:

```python
d = {"a": 1, "b": 2}
d.keys()[0]        # TypeError: 'dict_keys' object is not subscriptable
d.values()[-1]     # TypeError: 'dict_values' object is not subscriptable
d.items()[:2]      # TypeError: 'dict_items' object is not subscriptable
```

This is very common when running old Python 2 code or tutorials on Python 3.

## Fix 1: convert the view to a list

```python
keys = list(d.keys())
keys[0]           # 'a'
list(d.values())[-1]
list(d.items())[:2]
```

`list(d)` is the same as `list(d.keys())`. Since Python 3.7, dicts keep insertion order, so index `0` is the first key you inserted.

## Fix 2: get just the first item without copying

Building a list of a huge dict just to read one element is wasteful. Use an iterator:

```python
first_key = next(iter(d))
first_value = next(iter(d.values()))
first_key, first_value = next(iter(d.items()))
```

On an empty dict `next()` raises `StopIteration`; pass a default to avoid that:

```python
first_key = next(iter(d), None)
```

For the first N items, use `itertools.islice`:

```python
from itertools import islice
first_three = list(islice(d.items(), 3))
```

## Fix 3: you didn't actually need an index

Often the index was only used to loop or test membership. Use the view directly:

```python
for key, value in d.items():
    print(key, value)

if "a" in d:          # fast, no .keys() needed
    ...

common = d.keys() & other.keys()   # set operations work on views
```

## Fix 4: random or sorted access

```python
import random
random.choice(list(d))          # random key

sorted(d)[0]                    # alphabetically first key
max(d, key=d.get)               # key with the largest value
```

## Related: libraries that return views

The same error appears with anything dict-like, e.g. `json.load(...)`.keys(), `os.environ.keys()`, or `collections.OrderedDict`. The fix is the same: `list(...)` or `next(iter(...))`.

If you're porting Python 2 code, also watch for `iteritems()` (see [AttributeError: 'dict' object has no attribute 'iteritems'](/python/python-attributeerror-dict-object-has-no-attribute-iteritems/)) and `print` statements.
