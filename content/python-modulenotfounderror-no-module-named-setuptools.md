---
error: "ModuleNotFoundError: No module named 'setuptools'"
error_full: |
  Traceback (most recent call last):
    File "<string>", line 2, in <module>
  ModuleNotFoundError: No module named 'setuptools'
cat: python
description: "Code or a package build needed setuptools, but it isn't installed in the Python environment being used. Since Python 3.12, new virtual environments no longer include setuptools by default, so old setup.py-based projects hit this often."
tldr: "Install it into the same interpreter: `python -m pip install --upgrade setuptools` (inside your venv). On Debian/Ubuntu system Python use `sudo apt install python3-setuptools`. For a package that fails to build, upgrade pip first (`python -m pip install --upgrade pip`) so it can use build isolation."
keywords: python modulenotfounderror no module named setuptools pip install setuptools python 3.12 venv setup.py pkg_resources build isolation python3-setuptools
related: [python-no-module-named-distutils, python-failed-building-wheel, python-externally-managed-environment]
---
## What it means

`setuptools` is a third-party package (it provides `setup()`, `find_packages()` and `pkg_resources`). It used to be installed automatically into every virtual environment. Since **Python 3.12**, `python -m venv` only installs pip, and `distutils` was removed from the standard library, so anything that does `import setuptools` (or `import pkg_resources`) fails in a fresh environment.

First check which interpreter is running:

```bash
python -c "import sys; print(sys.executable)"
python -m pip --version
```

## Fix 1: install setuptools in the active environment

```bash
python -m pip install --upgrade setuptools
```

Use `python -m pip` rather than bare `pip` so the install goes into the same interpreter that raised the error. In a project with a `requirements.txt`, add `setuptools` there if your code imports it at runtime (e.g. `pkg_resources`).

## Fix 2: Debian/Ubuntu system Python

System Python is managed by apt, and `pip install` outside a venv is blocked (`externally-managed-environment`):

```bash
sudo apt install python3-setuptools
```

Better: create a virtual environment for your project and install there.

## Fix 3: a package fails to build from source

When `pip install somepackage` builds an old sdist whose `setup.py` imports setuptools, a modern pip installs setuptools in an isolated build environment automatically, as long as build isolation is on. Problems appear when:

- **pip is very old**: upgrade it with `python -m pip install --upgrade pip`.
- **`--no-build-isolation` is used** (some ML packages' docs recommend it): then setuptools and wheel must already be installed in your env:

```bash
python -m pip install setuptools wheel
python -m pip install --no-build-isolation somepackage
```

Often the cleanest fix is a newer version of the failing package that ships a prebuilt wheel for your Python version.

## Fix 4: your own project

If you maintain the package, declare the build backend in `pyproject.toml` so tools install setuptools for the build:

```toml
[build-system]
requires = ["setuptools>=61", "wheel"]
build-backend = "setuptools.build_meta"
```

and install with `python -m pip install .` instead of `python setup.py install`, which is deprecated.

## Fix 5: replace pkg_resources

Many runtime imports of setuptools are just `pkg_resources` for versions or data files. The standard library covers these:

```python
from importlib.metadata import version
print(version("requests"))

from importlib.resources import files
data = files("mypkg").joinpath("data.json").read_text()
```

That removes the runtime dependency on setuptools entirely.
