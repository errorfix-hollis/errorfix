---
error: "TypeError: 'str' object does not support item assignment"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 3, in <module>
      word[0] = "H"
  TypeError: 'str' object does not support item assignment
cat: python
description: "Python strings are immutable, so you can't change a character in place with s[i] = x. Build a new string instead (slicing, replace, join), or convert to a list first."
tldr: "Create a new string: `word = \"H\" + word[1:]`, or `word = word.replace(\"h\", \"H\", 1)`. For many edits convert to a list and back: `chars = list(word); chars[0] = \"H\"; word = \"\".join(chars)`. If you expected a dict, the variable was overwritten with a string — check where it's assigned."
keywords: typeerror str object does not support item assignment python string immutable change character replace slice join list tuple object does not support item assignment
related: [python-typeerror-string-indices-must-be-integers, python-attributeerror-str-object-has-no-attribute, python-typeerror-int-object-is-not-subscriptable]
---
## What it means

`s[i] = value` calls `s.__setitem__`. Strings (and tuples, bytes, frozensets) are **immutable** — they have no `__setitem__`, so Python raises this error. Reading `s[i]` is fine; writing is not.

Every string operation returns a *new* string; you reassign the variable to it.

## Fix 1: replace one character with slicing

```python
word = "hello"
word = "H" + word[1:]           # 'Hello'

i = 2
word = word[:i] + "L" + word[i + 1:]   # 'HeLlo'
```

## Fix 2: replace by value with `str.replace`

```python
s = "2024-01-15"
s = s.replace("-", "/")            # '2024/01/15'
s = s.replace("/", "-", 1)         # only the first occurrence
```

`replace` returns the new string — `s.replace(...)` on its own line does nothing visible. Assign the result.

## Fix 3: many edits — use a list of characters

When modifying characters in a loop, convert to a list (mutable), edit, and join once:

```python
chars = list("hello world")
for i, c in enumerate(chars):
    if c == "o":
        chars[i] = "0"
result = "".join(chars)           # 'hell0 w0rld'
```

This is also faster than repeated slicing for long strings. For character-by-character mapping, `str.translate` is the cleanest:

```python
table = str.maketrans({"a": "4", "e": "3"})
"release".translate(table)        # 'r3l34s3'
```

## Fix 4: you expected a dict or list, not a string

Often the code is fine but the variable holds the wrong type:

```python
data = response.text              # str, not dict
data["status"] = "ok"             # TypeError

import json
data = json.loads(response.text)  # or response.json() with requests
data["status"] = "ok"             # works
```

Other ways a variable becomes a string unexpectedly:

- Reading JSON from a file with `f.read()` instead of `json.load(f)`.
- A function sometimes returns an error message string instead of a dict.
- Initialising `result = ""` when you meant `result = {}` or `result = []`.
- Iterating over a dict and getting keys: `for row in config: row["x"] = 1` — `row` is the key (a string). Use `for key, row in config.items()`.

Debug with:

```python
print(type(data), repr(data)[:200])
```

## The same error for other types

- `'tuple' object does not support item assignment` — convert with `list(t)`, edit, then `tuple(...)` if needed, or use a list from the start. For records use `dataclasses` or `namedtuple._replace()`.
- `'bytes' object does not support item assignment` — use `bytearray(b)`, which is mutable.
- `'int' object does not support item assignment` — the variable is a number; check the assignment that should have made it a list/dict.

## Pandas note

`df["col"][0] = "x"` on a string column doesn't raise this error, but it uses chained assignment (`SettingWithCopyWarning`). Use `df.loc[0, "col"] = "x"`.
