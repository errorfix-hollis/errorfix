---
error: "TypeError: 'NoneType' object is not subscriptable"
cat: python
description: You used [] on a variable that is None. Find where it became None (often a function without return, or a failed lookup) and handle that case.
tldr: "The variable before `[` is `None`. Check the function that produced it: it probably has no `return`, returned early, or a lookup like `re.match()` / `dict.get()` found nothing."
keywords: nonetype object is not subscriptable typeerror none python function returns none
related: [python-attributeerror-nonetype-object-has-no-attribute]
---
## What it means

"Subscripting" is using square brackets: `x[0]`, `x['key']`. The variable `x` is `None`, and `None` has no items.

## Common causes

**1. A function that doesn't return anything**

```python
def load():
    data = {"name": "ann"}
    # forgot: return data

user = load()
user["name"]   # TypeError
```

**2. In-place methods return None**

```python
items = [3, 1, 2].sort()   # sort() sorts in place and returns None
items[0]                   # TypeError
```

Use `sorted([3, 1, 2])`, or call `.sort()` on its own line. Same for `list.append`, `list.reverse`, `random.shuffle`.

**3. A lookup that found nothing**

```python
m = re.match(r"(\d+)", "abc")
m[1]    # m is None because there was no match
```

Same with `dict.get()`, `soup.find()` in BeautifulSoup, database `fetchone()`, `os.environ.get()`.

## Fix: check before indexing

```python
m = re.match(r"(\d+)", text)
if m is None:
    raise ValueError(f"no number in {text!r}")
number = m[1]
```

## Find which variable is None

On Python 3.11+ the traceback underlines the exact expression. On older versions, split long lines like `a()[0]['x']` into steps, or print the values:

```python
print(repr(result))
```
