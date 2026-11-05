---
error: "TypeError: 'NoneType' object is not iterable"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 9, in <module>
      for item in get_items():
  TypeError: 'NoneType' object is not iterable
cat: python
description: You looped over, unpacked or called list()/sorted() on a value that is None. Usually a function forgot to return, returned None on some path, or you assigned the result of an in-place method like list.sort().
tldr: "Find which value is None (print it right before the line). Make sure the function returns a list on every path (`return []` instead of falling off the end), don't assign the result of in-place methods (`items.sort()` returns None; use `sorted(items)`), and guard optional values: `for x in items or []:`."
keywords: python typeerror nonetype object is not iterable none for loop unpack cannot unpack non-iterable nonetype function returns none sort append
related: [python-typeerror-nonetype-object-is-not-subscriptable, python-attributeerror-nonetype-object-has-no-attribute, python-valueerror-too-many-values-to-unpack]
---
## What it means

Something tried to iterate over `None`: a `for` loop, tuple unpacking (`a, b = value`), `list()`, `sorted()`, `sum()`, `in`, `*args` expansion or `", ".join(...)`. Since Python 3.10 unpacking gives a slightly different message: `TypeError: cannot unpack non-iterable NoneType object`. Same causes, same fixes.

Find the culprit first:

```python
result = get_items()
print(type(result), result)
```

## Cause 1: the function has no `return` on some path

A function that ends without `return` returns `None`:

```python
def get_items(user):
    if user.active:
        return user.items
    # inactive users fall off the end -> None

for item in get_items(user):   # TypeError
    ...
```

Fix: return an empty collection on every path.

```python
def get_items(user):
    if user.active:
        return user.items
    return []
```

The same happens when you `print()` a value instead of `return`ing it.

## Cause 2: assigning the result of an in-place method

`list.sort()`, `list.append()`, `list.extend()`, `list.reverse()`, `dict.update()`, `random.shuffle()` modify the object and return `None`:

```python
items = items.sort()      # items is now None
for x in items: ...       # TypeError
```

Fix:

```python
items.sort()              # in place, don't reassign
# or
items = sorted(items)     # returns a new list
```

## Cause 3: unpacking a function that returns None

```python
def load():
    try:
        return read_a(), read_b()
    except OSError as e:
        log(e)            # returns None here

a, b = load()             # cannot unpack non-iterable NoneType object
```

Re-raise the exception, or return a default tuple such as `return None, None`, and handle it at the call site.

## Cause 4: an API, regex or lookup returned None

Many functions return `None` on "not found":

```python
m = re.match(r"(\d+)-(\d+)", text)
start, end = m.groups() if m else (None, None)

data = response.json().get("items")   # None if the key is missing
for item in data or []:
    ...
```

`dict.get(key)` returns `None` unless you pass a default: `d.get("items", [])`. Test your patterns with the [regex tester](/tools/regex-tester/) if a `re.match` unexpectedly returns `None`.

## Cause 5: optional arguments defaulting to None

```python
def process(values=None):
    for v in values:      # TypeError when called as process()
        ...
```

Fix:

```python
def process(values=None):
    if values is None:
        values = []
    for v in values:
        ...
```

Don't use `values=[]` as the default — mutable defaults are shared between calls.

## Cause 6: pandas / ORM methods with `inplace=True`

`df = df.dropna(inplace=True)` sets `df` to `None`. Either use `inplace=True` without assignment, or drop `inplace` and assign: `df = df.dropna()`.
