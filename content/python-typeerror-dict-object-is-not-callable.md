---
error: "TypeError: 'dict' object is not callable"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 4, in <module>
      print(config("host"))
  TypeError: 'dict' object is not callable
cat: python
description: "You put parentheses after a dictionary, so Python tried to call it like a function. Either you meant square brackets, or a variable named dict shadows the built-in."
tldr: "Use square brackets or `.get()` to read keys: `config[\"host\"]` or `config.get(\"host\")`, not `config(\"host\")`. If the error comes from `dict(...)`, you assigned a variable called `dict` earlier: rename it and restart the interpreter/kernel (or `del dict`)."
keywords: python typeerror dict object is not callable dictionary parentheses square brackets shadow builtin dict variable name get method
related: [python-typeerror-list-object-is-not-callable, python-typeerror-str-object-is-not-callable, python-keyerror]
---
## What it means

In Python, `x(...)` means "call `x`". Only functions, classes and objects with a `__call__` method can be called. A `dict` can't, so `some_dict(...)` raises `TypeError: 'dict' object is not callable`.

The traceback line shows which expression has the parentheses. There are two usual reasons.

## Cause 1: parentheses instead of square brackets

```python
user = {"name": "Ada", "age": 36}

print(user("name"))      # TypeError
```

Fix: index with `[]`, or use `.get()` if the key might be missing:

```python
print(user["name"])            # raises KeyError if missing
print(user.get("name"))        # returns None if missing
print(user.get("email", ""))   # with a default
```

The same mistake happens with nested data from JSON:

```python
data = response.json()
city = data("address")("city")      # wrong
city = data["address"]["city"]      # right
```

## Cause 2: a variable named `dict` shadows the built-in

```python
dict = {"a": 1}          # overwrites the built-in dict type
...
counts = dict(zip(keys, values))   # TypeError: 'dict' object is not callable
```

After the first line, the name `dict` refers to your dictionary, not the type. Rename the variable:

```python
mapping = {"a": 1}
counts = dict(zip(keys, values))   # works again
```

In a Jupyter notebook or REPL the bad assignment stays in memory even after you fix the code. Either run `del dict` or restart the kernel (**Kernel → Restart**).

Other built-ins people shadow the same way: `list`, `str`, `set`, `type`, `id`, `input`, `sum`, `max`. Linters catch this: `pylint` reports `redefined-builtin` (W0622) and Ruff has rule `A001` (flake8-builtins).

## Cause 3: a function name reused as a dict

```python
def settings():
    return {"debug": True}

settings = settings()     # now 'settings' is the dict
settings()                # TypeError on the next call
```

Use different names for the function and its result:

```python
def load_settings():
    return {"debug": True}

settings = load_settings()
```

## Cause 4: an attribute that is a dict, not a method

Some libraries expose dictionaries as attributes, and calling them fails:

```python
r = requests.get(url)
r.headers("Content-Type")     # wrong: headers is a dict-like object
r.headers["Content-Type"]     # right
r.json()                      # json IS a method, so () is correct here
```

If you are not sure what something is, check before calling it:

```python
print(type(r.headers), callable(r.headers))
```

## Quick checklist

1. Find the line in the traceback and look for `name(` where `name` is a dict.
2. Replace `(...)` with `[...]` or `.get(...)`.
3. Search the file for `dict =` and rename it.
4. Restart the notebook kernel after renaming.
