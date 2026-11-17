---
error: "TypeError: cannot unpack non-iterable NoneType object"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 12, in <module>
      name, age = get_user(42)
  TypeError: cannot unpack non-iterable NoneType object
cat: python
description: "You tried to unpack a value into several variables (`a, b = ...`), but the value was None. Almost always a function that returns a tuple on one path and falls off the end (returning None) on another."
tldr: "Find the function on the right side of the assignment and make every path return a tuple, e.g. add `return None, None` or raise an exception instead of returning nothing. Or check before unpacking: `result = f(); if result is None: ...; a, b = result`."
keywords: python typeerror cannot unpack non-iterable nonetype object tuple unpacking function returns none multiple return values
related: [python-typeerror-nonetype-object-is-not-iterable, python-valueerror-not-enough-values-to-unpack, python-attributeerror-nonetype-object-has-no-attribute]
---
## What it means

Tuple unpacking (`a, b = value`) iterates over `value` and assigns each item. `None` is not iterable, so Python raises this `TypeError`. The bug is never in the unpacking line itself: it is wherever `None` came from.

Variants of the same problem:

- `TypeError: cannot unpack non-iterable int object` - the value was an int (e.g. `a, b = 5`).
- `TypeError: cannot unpack non-iterable bool object` - a function returned `False` instead of a tuple.

## Cause 1: a code path with no `return`

```python
def get_user(user_id):
    row = db.fetch(user_id)
    if row:
        return row["name"], row["age"]
    # no return here -> function returns None

name, age = get_user(42)   # TypeError when the user doesn't exist
```

## Fix 1: return a tuple (or raise) on every path

```python
def get_user(user_id):
    row = db.fetch(user_id)
    if row:
        return row["name"], row["age"]
    return None, None          # caller can still unpack
```

Raising is often better, because the caller cannot silently continue with bad data:

```python
    raise LookupError(f"user {user_id} not found")
```

Or check before unpacking:

```python
result = get_user(42)
if result is None:
    print("not found")
else:
    name, age = result
```

## Cause 2: unpacking the result of an in-place method

Methods that modify an object in place return `None`:

```python
a, b = my_list.sort()        # sort() returns None
x, y = my_dict.update(other) # update() returns None
```

## Fix 2: use the non-mutating version

```python
a, b = sorted(my_list)
```

## Cause 3: database / regex / library calls that return None

Common sources of `None`:

```python
row = cursor.fetchone()          # None when no rows match
id_, name = row                  # TypeError

m = re.match(r"(\w+)-(\d+)", s)  # None when no match
word, num = m.groups()           # AttributeError, but same idea
```

Check the result first:

```python
row = cursor.fetchone()
if row is not None:
    id_, name = row
```

## Cause 4: a function you overrode or mocked returns None

In tests, `unittest.mock.MagicMock()` returns a `MagicMock`, but a plain function stub with `pass` returns `None`. Set the return value explicitly:

```python
mock_get_user.return_value = ("alice", 30)
```

## How to find the source quickly

Print the value right before the failing line:

```python
result = get_user(42)
print(repr(result), type(result))
```

Type checkers catch this too: annotate the function as `-> tuple[str, int] | None` and `mypy` will flag the unchecked unpack.
