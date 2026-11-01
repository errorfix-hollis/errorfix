---
error: "TypeError: 'module' object is not callable"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 3, in <module>
      now = datetime()
  TypeError: 'module' object is not callable
cat: python
description: You called a module as if it were a function or class. The module and the thing inside it often share a name (datetime.datetime, tqdm.tqdm, glob.glob, socket.socket), so you imported the module when you meant the object.
tldr: "Call the object inside the module: `datetime.datetime.now()` or `from datetime import datetime`; `from tqdm import tqdm`; `glob.glob('*.txt')`. If it's your own file, `import mymodule` then `mymodule.MyClass()`, or `from mymodule import MyClass`. Check you didn't name a file the same as the package."
keywords: python typeerror module object is not callable import from datetime tqdm glob socket pprint class same name as module
related: [python-modulenotfounderror-no-module-named, python-cannot-import-name-partially-initialized-module, python-nameerror-name-is-not-defined]
---
## What it means

`import x` binds the name `x` to a **module** object. Modules are containers; you can't call them with `()`. When you write `x()`, Python raises this error. Since Python 3.12 the message often adds a hint, e.g. `Did you mean: 'datetime.datetime(...)'?`.

Check what a name refers to:

```python
print(type(datetime), datetime)
# <class 'module'> <module 'datetime' from '...'>
```

## Cause 1: module and class/function have the same name

Very common in the standard library and popular packages:

```python
import datetime
datetime.now()          # AttributeError
datetime()              # TypeError: 'module' object is not callable
```

Either import the object:

```python
from datetime import datetime
now = datetime.now()
```

or qualify it:

```python
import datetime
now = datetime.datetime.now()
```

Other pairs that trip people up:

| Wrong | Right |
|-------|-------|
| `import tqdm; tqdm(items)` | `from tqdm import tqdm` |
| `import glob; glob("*.csv")` | `glob.glob("*.csv")` |
| `import socket; socket()` | `socket.socket()` |
| `import pprint; pprint(obj)` | `pprint.pprint(obj)` or `from pprint import pprint` |
| `import random; random()` | `random.random()` |
| `import copy; copy(x)` | `copy.copy(x)` |
| `import decimal; decimal("1.1")` | `decimal.Decimal("1.1")` |

## Cause 2: your own module and class

You have `user.py` containing `class User`, and wrote:

```python
import user
u = user()          # TypeError
```

Fix:

```python
from user import User
u = User()
# or
import user
u = user.User()
```

Same in packages: if `models/__init__.py` doesn't import `Model`, then `from models import Model` won't work and `models()` fails. Import from the submodule: `from models.model import Model`.

## Cause 3: a name got shadowed by an import later on

```python
from tqdm import tqdm
...
import tqdm           # rebinds tqdm to the module
for x in tqdm(rows):  # TypeError
```

Search the file for a second import (or `import *`) that reuses the name. Keep one style per module.

## Cause 4: your file has the same name as the library

If your script is called `tqdm.py`, `requests.py` or `random.py`, `import tqdm` imports **your file**, not the library. Rename it (and delete any `__pycache__` folder next to it). Check with:

```python
import tqdm
print(tqdm.__file__)
```

## Cause 5: callable expected by a framework

Passing a module where a function or class is expected gives the same error from deep inside a library, e.g. `Thread(target=mytask)` where `mytask` is a module, or a Django URL pattern pointing at `views` instead of `views.home`. Pass the function: `path("", views.home)`.
