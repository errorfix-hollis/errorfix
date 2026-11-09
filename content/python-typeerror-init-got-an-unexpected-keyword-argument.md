---
error: "TypeError: __init__() got an unexpected keyword argument"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 12, in <module>
      user = User(name="Ana", emial="ana@example.com")
  TypeError: User.__init__() got an unexpected keyword argument 'emial'
cat: python
description: "You passed a keyword argument the constructor (or function) doesn't accept. Usually a typo, a parameter that was renamed or removed in a library upgrade, or a subclass that doesn't forward **kwargs."
tldr: "Check the real signature: `import inspect; print(inspect.signature(MyClass))`. Fix the spelling, or match the installed library version's API (`pip show <pkg>`; pin the old version or rename the argument as the changelog says). In subclasses, accept and forward extra arguments: `def __init__(self, *args, **kwargs): super().__init__(*args, **kwargs)`."
keywords: python typeerror __init__ got an unexpected keyword argument function got an unexpected keyword argument dataclass pydantic library upgrade renamed parameter kwargs super
related: [python-typeerror-missing-1-required-positional-argument-self, python-typeerror-takes-0-positional-arguments-but-1-was-given, python-attributeerror-nonetype-object-has-no-attribute]
---
## What it means

Python matched each `name=value` you passed against the parameters of the function. One name had no matching parameter and the function has no `**kwargs` to catch it. The message names the culprit: `'emial'` above. Python 3.10+ prefixes the qualified name (`User.__init__()`), which tells you exactly which class is complaining — it may not be the one you expect.

See the actual signature:

```python
import inspect
print(inspect.signature(User))        # constructor parameters
help(User)
```

## Cause 1: typo or wrong name

```python
User(name="Ana", emial="ana@example.com")   # typo
User(name="Ana", email="ana@example.com")   # fixed
```

Also common: camelCase vs snake_case (`userId` vs `user_id`), singular vs plural.

## Cause 2: library API changed between versions

The code (or tutorial) targets a different version than you have installed. Examples:

- `requests` / `urllib3`: `Retry(method_whitelist=...)` → `allowed_methods=...` (urllib3 2.0 removed the old name).
- SQLAlchemy 2.0: `create_engine(..., convert_unicode=True)` was removed.
- pandas: `read_csv(error_bad_lines=False)` → `on_bad_lines="skip"` (removed in 2.0).
- scikit-learn: `OneHotEncoder(sparse=False)` → `sparse_output=False` (removed in 1.4).
- Pydantic v2, OpenAI v1, LangChain: many renamed arguments.

Check your version and the changelog:

```bash
pip show urllib3
```

Then either update the argument name or pin the version the code was written for (`pip install "pandas<2"`). A mismatch between two libraries (one calling the other with an argument the installed version doesn't know) is fixed by upgrading or pinning them together.

## Cause 3: subclass doesn't forward arguments

```python
class Base:
    def __init__(self, name, debug=False): ...

class Child(Base):
    def __init__(self, name):
        super().__init__(name)

Child("x", debug=True)   # TypeError: Child.__init__() got an unexpected keyword argument 'debug'
```

Forward what you don't handle:

```python
class Child(Base):
    def __init__(self, name, **kwargs):
        super().__init__(name, **kwargs)
```

## Cause 4: dataclasses and field definitions

Only annotated class attributes become dataclass fields:

```python
from dataclasses import dataclass, field

@dataclass
class Config:
    host: str
    port = 8080            # no annotation: NOT a field, so Config(port=1) fails
    tags: list = field(default_factory=list)
```

Write `port: int = 8080`. Fields declared with `field(init=False)` also can't be passed to the constructor.

## Cause 5: decorators that hide the signature

A decorator that returns a wrapper with a fixed signature swallows keyword arguments. Use `functools.wraps` and pass `*args, **kwargs` through:

```python
import functools

def log(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper
```

## Cause 6: unpacking a dict with extra keys

`User(**data)` fails if `data` (e.g. JSON from an API) contains keys the class doesn't define. Filter first:

```python
import inspect
allowed = inspect.signature(User).parameters
user = User(**{k: v for k, v in data.items() if k in allowed})
```

Or use a model library that ignores extra fields (Pydantic's default behaviour).
