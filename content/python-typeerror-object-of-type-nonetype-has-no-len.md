---
error: "TypeError: object of type 'NoneType' has no len()"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 9, in <module>
      print(len(items))
  TypeError: object of type 'NoneType' has no len()
cat: python
description: "You called len() on a variable that is None. Something that should have returned a list, string or dict returned None instead, often an in-place method like list.sort() or a function with no return."
tldr: "Find where the variable was assigned. Don't assign the result of in-place methods (`items.sort()` returns None; use `items = sorted(items)`). Make sure your function ends with `return value`. Guard optional values: `len(items or [])` or `if items is not None:`."
keywords: python typeerror object of type nonetype has no len none len function returns none sort append in place regex match get default
related: [python-typeerror-nonetype-object-is-not-subscriptable, python-typeerror-nonetype-object-is-not-iterable, python-attributeerror-nonetype-object-has-no-attribute]
---
## What it means

`len(x)` only works on objects with a length (str, list, tuple, dict, set, ...). Here `x` is `None`. The `len()` line is just where it blows up; the real bug is wherever `None` was assigned. Trace the variable back:

```python
print(repr(items))   # None
```

## Cause 1: assigning the result of an in-place method

`list.sort()`, `list.append()`, `list.extend()`, `list.reverse()`, `dict.update()`, `random.shuffle()` change the object in place and return `None`:

```python
items = [3, 1, 2]
items = items.sort()     # items is now None
len(items)               # TypeError
```

Fix: don't reassign, or use the function that returns a new object:

```python
items.sort()             # in place
items = sorted(items)    # new list
```

## Cause 2: a function without `return`

A function that reaches its end without `return` returns `None`:

```python
def load_users(path):
    with open(path) as f:
        users = f.read().splitlines()
    # forgot: return users

users = load_users("users.txt")
len(users)               # TypeError
```

Also check every branch. If `return` is inside an `if`, the other path returns `None`:

```python
def find(items, key):
    if key in items:
        return items[key]
    return []            # explicit fallback
```

## Cause 3: lookups that return None on a miss

`dict.get()`, `re.match()`, `re.search()`, `os.environ.get()`, ORM `.first()` and BeautifulSoup `.find()` return `None` when nothing is found:

```python
tags = config.get("tags")            # None if the key is missing
tags = config.get("tags", [])        # default instead

m = re.search(r"\d+", text)
if m:
    print(len(m.group()))
```

## Cause 4: optional parameters

```python
def process(rows=None):
    for i in range(len(rows)):       # TypeError when called as process()
        ...
```

Normalise at the top:

```python
def process(rows=None):
    rows = rows or []
```

Use `if rows is None: rows = []` if an empty-but-valid value must be kept distinct.

## Cause 5: API or JSON fields that can be null

`null` in JSON becomes `None` in Python:

```python
data = r.json()
len(data["results"])                 # fails if "results": null

results = data.get("results") or []
```

## Cause 6: pandas / numpy

`df.dropna(inplace=True)`, `df.drop(..., inplace=True)`, `df.sort_values(..., inplace=True)` return `None`. Don't combine `inplace=True` with assignment:

```python
df = df.dropna()            # right
df = df.dropna(inplace=True)   # df is now None
```

## Safe pattern

```python
count = len(items) if items is not None else 0
```

But prefer fixing the source of `None`, so bugs don't get hidden. Type hints plus `mypy` catch many of these: a function annotated `-> list[str]` with a missing `return` is flagged before you run it.
