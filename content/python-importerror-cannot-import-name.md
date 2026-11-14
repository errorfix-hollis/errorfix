---
error: "ImportError: cannot import name 'X' from 'Y'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      from flask import escape
  ImportError: cannot import name 'escape' from 'flask' (/venv/lib/python3.12/site-packages/flask/__init__.py)
cat: python
description: "The module Y was found, but it has no name X. Usually the name was removed or moved in a newer version of the library, there is a typo, a local file shadows the real package, or two modules import each other."
tldr: "Check the path in the error: if it points to your own file, rename it. Otherwise check the installed version with `pip show Y`; if X was removed, import it from its new location (e.g. `from markupsafe import escape`) or pin the old version (`pip install \"Y<new\"`). If the message says \"partially initialized module\", it is a circular import."
keywords: python importerror cannot import name from module removed renamed version circular import shadowing pip show downgrade
related: [python-cannot-import-name-partially-initialized-module, python-attributeerror-module-has-no-attribute, python-modulenotfounderror-no-module-named]
---
## What it means

`from Y import X` found and loaded module `Y`, then looked for `X` inside it and didn't find it. That is different from `ModuleNotFoundError`, where `Y` itself is missing.

The path in parentheses at the end is the most useful clue: it shows *which file* Python loaded as `Y`.

## Cause 1: the name was removed or moved in a newer release

This is the most common case after a `pip install --upgrade` or a fresh install that pulled a new major version. Well-known examples:

| Error | Fix |
|---|---|
| `cannot import name 'escape' from 'flask'` | `from markupsafe import escape` |
| `cannot import name 'Markup' from 'jinja2'` | `from markupsafe import Markup` |
| `cannot import name 'url_quote' from 'werkzeug.urls'` | upgrade Flask, or `pip install "werkzeug<3"` |
| `cannot import name 'soft_unicode' from 'markupsafe'` | `pip install "markupsafe<2.1"` or upgrade the package using it |
| `cannot import name 'force_text' from 'django.utils.encoding'` | `force_str` (Django 4+) |
| `cannot import name 'Iterable' from 'collections'` | `from collections.abc import Iterable` (Python 3.10+) |
| `cannot import name 'triu' from 'scipy.linalg'` | `pip install "scipy<1.13"` or upgrade gensim |

Check what you have and read the library's changelog:

```bash
pip show flask          # Version: ...
pip index versions flask
```

Then either update your import or pin the version that matches your code in `requirements.txt`:

```bash
pip install "werkzeug<3"
```

## Cause 2: your own file shadows the package

If the path in the error points into your project instead of `site-packages`, you have a file or folder with the same name as the library:

```
ImportError: cannot import name 'Celery' from 'celery' (/home/me/proj/celery.py)
```

Rename your file (`celery.py` → `tasks.py`), and delete stale bytecode:

```bash
find . -name "__pycache__" -type d -exec rm -rf {} +
```

Common offenders: `random.py`, `email.py`, `requests.py`, `openai.py`, `numpy.py`, `test.py`, `token.py`.

## Cause 3: circular import

If the message includes `(most likely due to a circular import)` or `partially initialized module`, module A imports B while B imports A. See [cannot import name ... partially initialized module](/python/python-cannot-import-name-partially-initialized-module/) for the fixes (move the import into a function, or move shared code into a third module).

## Cause 4: typo, wrong case or wrong submodule

Names are case-sensitive and some live in a submodule:

```python
from sklearn import train_test_split                  # wrong
from sklearn.model_selection import train_test_split  # right

from PIL import image     # wrong
from PIL import Image     # right
```

List what a module actually exports:

```python
import flask
print([n for n in dir(flask) if not n.startswith("_")])
print(flask.__file__, getattr(flask, "__version__", "?"))
```

## Cause 5: wrong environment

You fixed the version in one virtualenv but run the code with another interpreter. Compare:

```bash
which python
python -c "import flask, sys; print(sys.executable, flask.__file__)"
```

In VS Code pick the interpreter with **Python: Select Interpreter**; in Jupyter run `%pip install ...` so it installs into the kernel's environment.
