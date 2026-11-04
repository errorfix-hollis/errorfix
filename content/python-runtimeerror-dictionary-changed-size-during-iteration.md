---
error: "RuntimeError: dictionary changed size during iteration"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 5, in <module>
      for key in d:
  RuntimeError: dictionary changed size during iteration
cat: python
description: You added or deleted keys in a dict (or set) while looping over it. Iterate over a copy of the keys, or build a new dict instead.
tldr: "Loop over a snapshot: `for k in list(d):` (or `list(d.items())`) and then `del d[k]` is safe. Better: build a new dict with a comprehension, e.g. `d = {k: v for k, v in d.items() if v is not None}`."
keywords: python runtimeerror dictionary changed size during iteration delete key while iterating for loop list(d) dict comprehension set changed size during iteration
related: [python-keyerror, python-recursionerror-maximum-recursion-depth, python-indexerror-list-index-out-of-range]
---
## What it means

A dict iterator remembers the dict's size. If keys are added or removed while the loop runs, Python can't guarantee every key is visited exactly once, so it stops with this error:

```python
d = {"a": 1, "b": None, "c": 3}
for k in d:
    if d[k] is None:
        del d[k]        # RuntimeError: dictionary changed size during iteration
```

Changing the *values* of existing keys (`d[k] = 0`) is allowed. Only adding or removing keys triggers it. Sets behave the same way (`RuntimeError: Set changed size during iteration`).

## Fix 1: iterate over a copy of the keys

```python
for k in list(d):          # list(d) is a snapshot of the keys
    if d[k] is None:
        del d[k]

for k, v in list(d.items()):
    if v is None:
        d.pop(k)
```

In Python 3, `d.keys()` and `d.items()` are live *views*, not copies, so `for k in d.keys():` still fails. You need `list(...)`.

## Fix 2: build a new dict

Usually clearer and just as fast:

```python
d = {k: v for k, v in d.items() if v is not None}
```

If other code holds a reference to the same dict object and must see the change, update it in place:

```python
keep = {k: v for k, v in d.items() if v is not None}
d.clear()
d.update(keep)
```

## Fix 3: collect changes, apply after the loop

When adding keys based on existing ones:

```python
additions = {}
for k, v in d.items():
    additions[k.upper()] = v
d.update(additions)
```

Same pattern for deletions:

```python
to_delete = [k for k, v in d.items() if v is None]
for k in to_delete:
    del d[k]
```

## Cause: a function called inside the loop mutates the dict

The change isn't always visible in the loop body. A helper, a callback, or a cache (e.g. `cache.setdefault(...)`) can add keys to the dict you're iterating. Look at the traceback line that the loop starts on, then check every call inside it for writes to the same object.

## Cause: threads

Another thread modifying a shared dict while one thread iterates causes the same error intermittently. Iterate over a snapshot (`for k, v in list(shared.items()):`) or guard access with a `threading.Lock`.

## Sets and `os.environ`

```python
s = {1, 2, 3, 4}
s = {x for x in s if x % 2}     # instead of s.remove() inside the loop
```

`os.environ` and objects like `sys.modules` are dict-like and fail the same way when modified during iteration; use `list(os.environ)` for the loop.

## Note on lists

Lists don't raise an error when modified during iteration, but they silently skip elements. Removing items from a list inside `for x in lst:` is a bug too; use `lst = [x for x in lst if keep(x)]`.
