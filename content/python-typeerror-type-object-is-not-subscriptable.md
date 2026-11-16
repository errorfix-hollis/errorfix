---
error: "TypeError: 'type' object is not subscriptable"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 3, in <module>
      def load(names: list[str]) -> dict[str, int]:
  TypeError: 'type' object is not subscriptable
cat: python
description: "You used square brackets on a class rather than an instance. Most often it's a built-in generic type hint like list[str] or dict[str, int] on Python 3.8 or older, or a variable named after a type (list, dict, str)."
tldr: "On Python 3.8 and older, either add `from __future__ import annotations` at the top of the file, or use `typing.List[str]`, `typing.Dict[str, int]`. Better: upgrade to Python 3.9+. If it's not a type hint, you're indexing the class itself (`list[0]`) — index your variable instead, and don't name variables `list`/`dict`/`str`."
keywords: typeerror type object is not subscriptable list[str] dict[str int] python 3.8 type hints from __future__ import annotations typing List Dict generic alias
related: [python-typeerror-int-object-is-not-subscriptable, python-typeerror-nonetype-object-is-not-subscriptable, python-typeerror-list-object-is-not-callable]
---
## What it means

Subscripting means using `[...]` on an object. `x[0]` calls `x.__getitem__`; `SomeClass[int]` calls `SomeClass.__class_getitem__`. If the class defines neither for the class itself, Python raises `'type' object is not subscriptable` — "type" here means "a class".

## Cause 1: built-in generics on Python 3.8 or older

PEP 585 (Python **3.9**) made `list[str]`, `dict[str, int]`, `tuple[int, ...]`, `set[str]`, `type[Foo]` valid. On 3.8 and older these lines fail as soon as the function is defined:

```python
def load(names: list[str]) -> dict[str, int]:   # TypeError on 3.8
    ...
```

Check the version that actually runs the code (CI, Docker image, server):

```bash
python --version
```

Fixes, best first:

1. **Upgrade to Python 3.9+** (3.8 is end-of-life since October 2024).
2. **Postpone evaluation of annotations** (works on 3.7+) — annotations are stored as strings and never evaluated:

   ```python
   from __future__ import annotations

   def load(names: list[str]) -> dict[str, int]:
       ...
   ```

   This only covers annotations. Code that evaluates the type at runtime still fails, e.g. `Names = list[str]` (type alias), `cast(list[str], x)`, `isinstance` checks, or libraries like pydantic/FastAPI that resolve hints on old Python versions.
3. **Use the `typing` equivalents**, which work on every Python 3 version:

   ```python
   from typing import Dict, List, Optional

   Names = List[str]
   def load(names: List[str]) -> Dict[str, int]: ...
   ```

The same applies to `collections.abc` types: `collections.abc.Callable[[int], str]` and `Iterable[str]` need 3.9+ (or `typing.Callable`, `typing.Iterable`).

## Cause 2: indexing a class instead of an instance

```python
class Config:
    def __init__(self):
        self.data = {"port": 8080}

Config["port"]            # TypeError: 'type' object is not subscriptable
cfg = Config()
cfg.data["port"]          # OK
```

A common variant is forgetting the parentheses when creating an object: `cfg = Config` (assigns the class) instead of `cfg = Config()`.

If you want instances to support `obj["key"]`, implement `__getitem__`:

```python
class Config:
    def __getitem__(self, key):
        return self.data[key]
```

## Cause 3: a variable shadowed by a built-in type name

```python
def total(list):           # parameter named 'list'
    ...

list = [1, 2, 3]
del list
print(list[0])             # 'list' is the built-in class again -> TypeError
```

More often it's the reverse: you meant to index your variable but used a name like `str`, `dict`, `list` or `type` that refers to the class. Rename variables so they don't collide with built-ins (`items`, `names`, `row`).

## Cause 4: your own generic classes

To make your class subscriptable in hints, inherit from `typing.Generic`:

```python
from typing import Generic, TypeVar
T = TypeVar("T")

class Box(Generic[T]):
    def __init__(self, item: T):
        self.item = item

b: Box[int] = Box(1)
```

Python 3.12+ also allows `class Box[T]: ...`.

## Related messages

- `'int' object is not subscriptable`, `'NoneType' object is not subscriptable` — you indexed an instance that doesn't support it.
- `'function' object is not subscriptable` — you wrote `func[0]` instead of `func(0)` or `func()[0]`.
- `'method' object is not subscriptable` — e.g. `df.groupby["col"]` instead of `df.groupby("col")`.
