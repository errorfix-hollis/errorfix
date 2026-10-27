---
error: "KeyError"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 3, in <module>
      print(user["email"])
            ~~~~^^^^^^^^^
  KeyError: 'email'
cat: python
description: You looked up a dictionary key that doesn't exist. Check the actual keys, use .get() with a default, or handle the missing case.
tldr: "Use `d.get('email')` (returns `None`) or `d.get('email', 'default')` instead of `d['email']`, or check first with `if 'email' in d:`. Print `d.keys()` to see what keys really exist."
keywords: python keyerror dictionary key not found get default pandas column json api response
related: [python-typeerror-nonetype-object-is-not-subscriptable]
---
## What it means

`d["email"]` requires the key to exist. It doesn't, so Python raises `KeyError` with the missing key.

## Find out what's actually in the dictionary

```python
print(list(user.keys()))
```

Common surprises: different case (`"Email"`), extra whitespace (`"email "`), the data is nested one level deeper (`user["data"]["email"]`), or a number vs. string key (`1` vs `"1"`).

## Fix 1: provide a default

```python
email = user.get("email")              # None if missing
email = user.get("email", "unknown")
```

## Fix 2: check first

```python
if "email" in user:
    send(user["email"])
```

## Fix 3: handle it

```python
try:
    email = user["email"]
except KeyError:
    log.warning("user %s has no email", user.get("id"))
```

## Counting / grouping

Instead of initialising keys manually, use `collections.defaultdict` or `Counter`:

```python
from collections import defaultdict
groups = defaultdict(list)
groups[key].append(item)     # no KeyError on first use
```

## pandas: KeyError on a column

`df["Price"]` raises `KeyError: 'Price'` if the column name differs. Check `df.columns.tolist()`; headers often have stray spaces. Clean them with `df.columns = df.columns.str.strip()`.

## JSON from an API

APIs often omit fields or return an error object instead of data. Print the response (`print(resp.status_code, resp.json())`) before indexing into it.
