---
error: "AttributeError: module 'X' has no attribute 'Y'"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 3, in <module>
      r = requests.get(url)
  AttributeError: module 'requests' has no attribute 'get'
cat: python
description: "The module Python imported doesn't define that name. Usually a local file shadows the real package, the attribute was removed or renamed in the installed version, or a submodule wasn't imported."
tldr: "Run `python -c \"import X; print(X.__file__)\"`. If it points at your own `X.py`, rename that file and delete `__pycache__`. Otherwise check the installed version (`pip show X`) — the attribute may be renamed/removed (e.g. `np.float` → `float`) — or import the submodule explicitly (`import os.path`, `import scipy.stats`)."
keywords: python attributeerror module has no attribute shadowing file name same as module __pycache__ circular import submodule numpy np.float removed version
related: [python-cannot-import-name-partially-initialized-module, python-typeerror-module-object-is-not-callable, python-modulenotfounderror-no-module-named]
---
## What it means

`import X` succeeded, so Python found *something* called `X`. But `X.Y` doesn't exist on that module object. The key question is which file was actually imported:

```python
import requests
print(requests.__file__)
print(dir(requests))
```

## Cause 1: your file has the same name as the module

The #1 cause. A script named `random.py`, `requests.py`, `json.py`, `email.py`, `csv.py`, `numpy.py`, `openai.py` etc. sits in the current directory, and Python imports *it* instead of the real package (the script's folder comes first on `sys.path`).

```text
project/
  requests.py      # <- your script
```

```python
import requests
requests.get(...)   # AttributeError: module 'requests' has no attribute 'get'
```

Fix:

```bash
mv requests.py fetch_data.py
rm -rf __pycache__ requests.pyc
```

Also check for a *folder* with that name (e.g. `openai/`, `test/`).

## Cause 2: circular import

If `a.py` imports `b` and `b.py` imports `a`, one of them sees a half-initialized module, so attributes defined lower in the file don't exist yet. The message often says `partially initialized module`. Move the shared code into a third module, or import inside the function that needs it. See [partially initialized module](/python/python-cannot-import-name-partially-initialized-module/).

## Cause 3: the attribute was removed or renamed in your version

Libraries drop old names. Frequent examples:

| Error | Fix |
|---|---|
| `module 'numpy' has no attribute 'float'` / `'int'` / `'bool'` | use built-ins `float`, `int`, `bool` (removed in NumPy 1.24) |
| `module 'numpy' has no attribute 'NaN'` | `np.nan` (NumPy 2.0) |
| `module 'collections' has no attribute 'Mapping'` | `from collections.abc import Mapping` (Python 3.10) |
| `module 'openai' has no attribute 'ChatCompletion'` | openai>=1.0: `client = OpenAI(); client.chat.completions.create(...)` |
| `module 'tensorflow' has no attribute 'Session'` | TF2: eager mode, or `tf.compat.v1.Session` |

Check your version and the changelog:

```bash
python -m pip show numpy
```

Either update your code, or pin the old version (`pip install "numpy<1.24"`) as a temporary fix.

## Cause 4: submodule not imported

Some packages don't import their submodules automatically:

```python
import scipy
scipy.stats.norm      # may fail on older SciPy

import scipy.stats    # explicit import
import xml.etree.ElementTree as ET
import importlib.util
```

## Cause 5: wrong package installed

Some PyPI names differ from the import name. Installing `jwt` instead of `PyJWT`, or `serial` instead of `pyserial`, gives a module with completely different contents:

```bash
pip uninstall jwt && pip install PyJWT
pip uninstall serial && pip install pyserial
```

## Cause 6: typo or wrong case

`math.Sqrt` vs `math.sqrt`, `datetime.now()` on the module instead of `datetime.datetime.now()`. Use `dir(module)` to see what's available.
