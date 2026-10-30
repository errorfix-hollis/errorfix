---
error: "ImportError: attempted relative import with no known parent package"
error_full: |
  Traceback (most recent call last):
    File "/home/me/project/mypkg/main.py", line 1, in <module>
      from .utils import helper
  ImportError: attempted relative import with no known parent package
cat: python
description: You ran a file that uses relative imports (`from .x import y`) as a top-level script, so Python doesn't know which package it belongs to. Run it as a module with `python -m` from the project root.
tldr: "From the directory that contains the package, run `python -m mypkg.main` instead of `python mypkg/main.py`. Or switch to absolute imports (`from mypkg.utils import helper`) and install the project with `pip install -e .`."
keywords: python importerror attempted relative import with no known parent package python -m __package__ __init__.py from . import relative import script
related: [python-modulenotfounderror-no-module-named, python-filenotfounderror-no-such-file-or-directory]
---
## What it means

A relative import like `from .utils import helper` means "import `utils` from the same package as this module". Python determines "this package" from the module's `__package__`. When you run a file directly (`python mypkg/main.py`), it is loaded as `__main__` with no parent package, so the leading dot has nothing to be relative to.

Example layout used below:

```
project/
├── mypkg/
│   ├── __init__.py
│   ├── main.py        # from .utils import helper
│   └── utils.py
└── tests/
```

## Fix 1: run it as a module with `-m`

From `project/` (the directory *containing* `mypkg`):

```bash
cd project
python -m mypkg.main
```

Note: dots instead of slashes, and no `.py`. Python now imports `mypkg` as a package and `main` as `mypkg.main`, so relative imports work.

In VS Code, use a launch configuration with `"module": "mypkg.main"` instead of `"program"`.

## Fix 2: use absolute imports

```python
# mypkg/main.py
from mypkg.utils import helper
```

This works with `python -m mypkg.main` from the project root. Running `python mypkg/main.py` will instead raise `ModuleNotFoundError: No module named 'mypkg'`, because the script's own directory (`mypkg/`) is put on `sys.path`, not `project/`.

## Fix 3: make the project installable

For anything beyond a quick script, add a `pyproject.toml` to `project/`:

```toml
[build-system]
requires = ["setuptools>=61"]
build-backend = "setuptools.build_meta"

[project]
name = "mypkg"
version = "0.1.0"
```

Then install it in editable mode inside your virtualenv:

```bash
pip install -e .
```

Now `import mypkg` works from anywhere (tests, notebooks, other scripts), and both relative and absolute imports inside the package resolve correctly.

## Fix 4: add an entry point outside the package

Keep a tiny runner script next to the package:

```python
# project/run.py
from mypkg.main import main

if __name__ == "__main__":
    main()
```

```bash
python run.py
```

## Check `__init__.py`

Relative imports also need the parent to be a package. Namespace packages (no `__init__.py`) work in Python 3.3+, but adding an empty `mypkg/__init__.py` avoids surprises with tools like pytest and mypy.

## Avoid sys.path hacks

```python
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
```

This "works" but breaks depending on where you run from and hides the real structure problem. Prefer `python -m` or `pip install -e .`.

## Related: "attempted relative import beyond top-level package"

That variant means you used `..` to go above the top package that Python knows about. Run from a higher directory (`python -m project.mypkg.main` if `project` is itself a package) or use absolute imports.
