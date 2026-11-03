---
error: "TypeError: string indices must be integers"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 5, in <module>
      print(user["name"])
  TypeError: string indices must be integers, not 'str'
cat: python
description: You indexed a str with a string (or other non-integer) key, as if it were a dict. Usually the data is still raw JSON text, or you are iterating over a dict's keys instead of its values.
tldr: "Check `type(x)` — it is a `str`, not a `dict`. Parse JSON first with `data = json.loads(text)` (or `response.json()`), and iterate dicts with `for k, v in d.items()` instead of `for item in d`."
keywords: python typeerror string indices must be integers not str json loads dict iterate keys response.json slice
related: [python-keyerror, python-typeerror-nonetype-object-is-not-subscriptable, js-unexpected-token-in-json]
---
## What it means

Strings can only be indexed by integers (`s[0]`) or slices (`s[1:4]`). When you write `x["name"]` and `x` turns out to be a `str`, Python raises this error. Python 3.11+ phrases it as `string indices must be integers, not 'str'`.

The fix is almost never in the line that fails — it's in wherever `x` became a string. Print it first:

```python
print(type(user), repr(user)[:200])
```

## Cause 1: JSON that was never parsed

```python
import requests
r = requests.get("https://api.example.com/user/1")
user = r.text              # a str!
print(user["name"])        # TypeError
```

Fix: decode the JSON into Python objects.

```python
user = r.json()            # dict
# or, for text from a file / message queue:
import json
user = json.loads(text)
# from a file:
with open("user.json") as f:
    user = json.load(f)
```

A related trap is **double-encoded JSON**: `json.loads()` returns a `str` again because the payload was serialized twice (`"{\"name\": \"a\"}"`). Calling `json.loads()` a second time works, but fixing the producer (don't `json.dumps` something that's already a JSON string) is better.

## Cause 2: iterating over a dict gives keys, not values

```python
users = {"alice": {"age": 30}, "bob": {"age": 25}}
for u in users:
    print(u["age"])        # u is "alice" — a str
```

Fix:

```python
for name, info in users.items():
    print(name, info["age"])
```

## Cause 3: iterating over a dict when you expected a list

APIs often return `{"results": [...]}`. Looping over the top-level object yields its keys:

```python
data = r.json()
for item in data:          # item == "results"
    print(item["id"])
```

Fix: loop over the list inside it.

```python
for item in data["results"]:
    print(item["id"])
```

## Cause 4: a slice written with commas or a float index

```python
s = "hello"
s[1, 3]      # TypeError: string indices must be integers (tuple)
s[len(s)/2]  # float index -> "string indices must be integers"
```

Fix:

```python
s[1:3]
s[len(s) // 2]   # integer division
```

## Cause 5: a CSV/form value that is a string

`csv.reader` rows, `input()`, `sys.argv` and `request.form` values are all strings. If you index into them with a key, you get this error. Use `csv.DictReader` if you want rows keyed by column name:

```python
import csv
with open("users.csv", newline="") as f:
    for row in csv.DictReader(f):
        print(row["name"])
```

## Quick checklist

- `print(type(x))` right before the failing line.
- If it's JSON text, `json.loads` it.
- If you're in a `for` loop over a dict, use `.items()` or `.values()`.
- If you meant a slice, use `:` not `,`.
