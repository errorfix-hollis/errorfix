---
error: "AttributeError: 'str' object has no attribute"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 7, in <module>
      data.append("x")
  AttributeError: 'str' object has no attribute 'append'
cat: python
description: "You called a method or attribute on a string that strings don't have. Usually the variable holds a str when you expected a list, dict, JSON object or other type."
tldr: "Print `type(x)` right before the failing line. If it is a JSON string, parse it with `json.loads(x)`; if you meant a list, build one (`items = [x]`) or use string concatenation (`s += \"x\"`). For `'str' object has no attribute 'decode'`, the value is already text in Python 3: drop `.decode()`."
keywords: python attributeerror str object has no attribute append decode keys get read json loads string vs list type
related: [python-attributeerror-nonetype-object-has-no-attribute, python-typeerror-string-indices-must-be-integers, python-attributeerror-module-has-no-attribute]
---
## What it means

The variable is a `str`, and the attribute after the dot (`'append'`, `'decode'`, `'get'`, `'keys'`, ...) does not exist on strings. The bug is almost never the method call itself; it is that the value has the wrong type. Check it first:

```python
print(type(data), repr(data)[:200])
```

The name in quotes at the end of the error tells you which case you are in.

## Cause 1: `'append'` — you expected a list

```python
names = "alice"
names.append("bob")      # AttributeError
```

Strings are immutable and have no `append`. Either make it a list, or join strings:

```python
names = ["alice"]
names.append("bob")

# or, if you really want a string
text = "alice"
text += ", bob"
```

A common source is reassigning a list variable inside a loop, e.g. `result = line.strip()` instead of `result.append(line.strip())`.

## Cause 2: `'decode'` — Python 2 code on Python 3

```python
s = "hello"
s.decode("utf-8")     # AttributeError: 'str' object has no attribute 'decode'
```

In Python 3, `str` is already decoded text. Only `bytes` have `.decode()`. Remove the call, or guard it:

```python
if isinstance(value, bytes):
    value = value.decode("utf-8")
```

Older libraries hit this too (for example old Keras/h5py combinations); upgrading the library usually fixes it.

## Cause 3: `'get'`, `'keys'`, `'items'` — JSON that was never parsed

```python
import json

payload = '{"id": 1, "name": "Ada"}'
payload.get("id")          # AttributeError: 'str' object has no attribute 'get'

obj = json.loads(payload)  # str -> dict
obj.get("id")              # 1
```

With `requests`, use `r.json()` instead of `r.text`. If an API returns JSON that is itself a JSON-encoded string (double encoded), you need `json.loads` twice. Paste the raw value into a [JSON formatter](/tools/json-formatter/) to see what you actually got.

## Cause 4: iterating a dict or string gives strings

```python
users = {"ada": {...}, "bob": {...}}
for u in users:
    print(u.name)          # u is the key (a str)

for name, info in users.items():
    print(name, info)
```

Looping over a string gives single-character strings, so `for row in "abc": row.split(...)` is also a wrong-type bug.

## Cause 5: `'read'` — passing a filename instead of a file object

```python
json.load("config.json")       # AttributeError: 'str' object has no attribute 'read'

with open("config.json") as f:
    cfg = json.load(f)
```

`json.load`, `csv.reader`, `pickle.load` and similar want an open file, not a path. Use `json.loads` for a string of JSON.

## Cause 6: a name shadowed by a string

```python
import os
os = "linux"
os.path.join("a", "b")        # AttributeError: 'str' object has no attribute 'path'
```

Rename the variable and restart the REPL or notebook kernel so the old value is gone.

## Cause 7: methods that exist with a different name

| You wrote | Use instead |
|---|---|
| `s.contains("x")` | `"x" in s` |
| `s.length` | `len(s)` |
| `s.push("x")` | `s + "x"` |
| `s.toUpperCase()` | `s.upper()` |
| `s.trim()` | `s.strip()` |
