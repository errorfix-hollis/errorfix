---
error: "AttributeError: 'dict' object has no attribute 'iteritems'"
error_full: |
  Traceback (most recent call last):
    File "script.py", line 8, in <module>
      for key, value in data.iteritems():
  AttributeError: 'dict' object has no attribute 'iteritems'
cat: python
description: "dict.iteritems(), iterkeys(), itervalues() and has_key() were Python 2 methods and were removed in Python 3. The code (or an old library) was written for Python 2."
tldr: "Replace `d.iteritems()` with `d.items()`, `d.iterkeys()` with `d.keys()` or just `d`, `d.itervalues()` with `d.values()`, and `d.has_key(k)` with `k in d`. If the error comes from a third-party package, upgrade it (`pip install -U <package>`) or switch to a maintained fork."
keywords: python attributeerror dict object has no attribute iteritems has_key iterkeys itervalues python 3 python 2 items keys values 2to3 networkx
related: [python-attributeerror-nonetype-object-has-no-attribute, python-runtimeerror-dictionary-changed-size-during-iteration, python-keyerror]
---
## What it means

Python 2 had two families of dict methods: `items()`/`keys()`/`values()` returned lists, and `iteritems()`/`iterkeys()`/`itervalues()` returned iterators. Python 3 dropped the `iter*` versions and made the plain methods return lightweight *view* objects, which are already lazy. `has_key()` was also removed in favour of the `in` operator.

So the code isn't wrong for its era, it's Python 2 code running on Python 3.

## Fix 1: use the Python 3 methods

| Python 2 | Python 3 |
|---|---|
| `d.iteritems()` | `d.items()` |
| `d.iterkeys()` | `d.keys()` or iterate `d` directly |
| `d.itervalues()` | `d.values()` |
| `d.has_key(k)` | `k in d` |
| `d.viewitems()` | `d.items()` |

```python
for key, value in data.items():
    print(key, value)

if "name" in data:
    ...
```

Views reflect changes to the dict and don't copy it, so performance is the same as the old `iteritems()`.

## Fix 2: you need a list, not a view

In Python 2, `d.keys()` returned a list, so old code might index it or modify the dict while looping:

```python
first_key = d.keys()[0]          # TypeError: 'dict_keys' object is not subscriptable
first_key = next(iter(d))        # Python 3
keys = list(d.keys())            # when you need a real list

for k in list(d):                # copy before deleting during the loop
    if d[k] is None:
        del d[k]
```

Deleting keys while iterating over a view raises `RuntimeError: dictionary changed size during iteration`.

## Fix 3: convert a whole codebase

For many files, convert automatically. `2to3` was removed in Python 3.13, so use `pyupgrade`:

```bash
pip install pyupgrade
pyupgrade --py3-plus $(git ls-files '*.py')
```

On Python 3.12 or older, `2to3` still exists:

```bash
2to3 -f dict -w script.py
```

Review the diff: the `dict` fixer wraps calls in `list(...)` conservatively, which you can often remove.

## Fix 4: code that must run on Python 2 and 3

Rare today, but if you need it, `items()` works on both (it just returns a list on 2). Or use `six`:

```python
import six
for k, v in six.iteritems(d):
    ...
```

## Fix 5: the error comes from a library

Look at the traceback: if the failing line is inside `site-packages`, a dependency is Python 2 only or very old. Common cases:

- **networkx 1.x** (`G.node[n]`, `G.edges_iter()`): upgrade with `pip install -U networkx`.
- Old Django apps, `pydot`, `xlrd`-era scripts: upgrade to a current version.

```bash
pip install -U package-name
pip show package-name          # check the version and its Python support
```

If the project is abandoned, look for a maintained fork, or patch the line locally as a stopgap.

## Related Python 2 leftovers

Same story, different message: `print "x"` (`SyntaxError: Missing parentheses in call to 'print'`), `xrange` (`NameError`, use `range`), `unicode` (use `str`), `raw_input` (use `input`), and `string.letters` (use `string.ascii_letters`).
