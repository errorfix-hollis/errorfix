---
error: "ImportError: cannot import name 'X' from partially initialized module 'Y' (most likely due to a circular import)"
error_full: |
  Traceback (most recent call last):
    File "/app/main.py", line 1, in <module>
      from models import User
    File "/app/models.py", line 2, in <module>
      from services import send_email
    File "/app/services.py", line 1, in <module>
      from models import User
  ImportError: cannot import name 'User' from partially initialized module 'models' (most likely due to a circular import) (/app/models.py)
cat: python
description: Two modules import each other (directly or through a chain), so one of them is used before it has finished executing. It also happens when your own file has the same name as the library you're importing.
tldr: "Check your file names first: a script called `random.py`, `requests.py` or `openai.py` shadows the real package — rename it and delete `__pycache__`. For real cycles, use `import module` instead of `from module import name`, move the import inside the function that needs it, or move shared code into a third module."
keywords: python importerror cannot import name from partially initialized module most likely due to a circular import shadowing file name __pycache__ from import
related: [python-modulenotfounderror-no-module-named, python-attempted-relative-import-with-no-known-parent-package, python-attributeerror-nonetype-object-has-no-attribute]
---
## What it means

Python runs a module top to bottom the first time it's imported, and puts it in `sys.modules` **before** it finishes. If, while `models.py` is still running, something imports `models` again, Python returns the half-built module. `from models import User` then fails because the line defining `User` hasn't run yet.

The traceback shows the cycle: `main → models → services → models`.

## Cause 1: your file shadows a library

The most common case for beginners:

```
ImportError: cannot import name 'randint' from partially initialized module 'random'
(most likely due to a circular import) (/home/me/random.py)
```

The path at the end is **your** file. Python imports your `random.py` instead of the standard library, and your file imports itself. Rename it, and remove cached bytecode:

```bash
mv random.py dice_game.py
rm -rf __pycache__
```

Typical offenders: `random.py`, `email.py`, `requests.py`, `pandas.py`, `openai.py`, `socket.py`, `test.py`, `typing.py`. Also check for a folder with that name.

## Fix 2: import the module, not the name

`from x import y` needs `y` to exist right now; `import x` only needs the module object, and attributes are looked up later, at call time:

```python
# services.py
import models

def send_welcome(user_id):
    user = models.User.get(user_id)   # resolved when the function runs
```

## Fix 3: move the import into the function

```python
# services.py
def send_welcome(user_id):
    from models import User           # imported on first call, cycle already resolved
    ...
```

This is a common, legitimate pattern for breaking cycles (Django and Flask apps use it a lot).

## Fix 4: import only for type hints

If one side only needs the other for annotations:

```python
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models import User

def send_welcome(user: User) -> None: ...
```

`TYPE_CHECKING` is `False` at runtime, so there's no import cycle.

## Fix 5: restructure

A cycle usually means two modules each contain something the other needs. Move the shared pieces (constants, base classes, helpers) into a new module that both import, and that imports neither:

```
models.py   -> imports common.py
services.py -> imports common.py, models.py
common.py   -> imports nothing from the app
```

## Fix 6: package `__init__.py` imports

An `__init__.py` that does `from .views import *` while `views.py` does `from mypackage import db` creates a cycle through the package. Import from the specific submodule instead (`from mypackage.db import db`), and keep `__init__.py` light.
