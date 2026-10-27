---
error: "ModuleNotFoundError: No module named 'distutils'"
cat: python
description: distutils was removed in Python 3.12. Install setuptools (which provides a replacement), or upgrade the package that still imports distutils.
tldr: "Run `python -m pip install setuptools` (it provides a `distutils` shim). Better long-term: upgrade the package that needs it (often old numpy, gyp/node-gyp, or virtualenv)."
keywords: no module named distutils python 3.12 setuptools removed pep 632 node-gyp numpy pip install
related: [python-modulenotfounderror-no-module-named]
---
## What it means

`distutils` was deprecated by PEP 632 and **removed from the standard library in Python 3.12**. Old packages and build scripts that still `import distutils` fail on 3.12+.

## Fix 1: install setuptools

setuptools ships a compatible `distutils` and makes it importable:

```bash
python -m pip install --upgrade setuptools
```

In a virtual environment, run that inside the venv. On Debian/Ubuntu system Python: `sudo apt install python3-setuptools`.

## Fix 2: upgrade the package that needs it

- **numpy < 1.26** doesn't build on 3.12. Use `numpy>=1.26`.
- **node-gyp** (npm native modules): upgrade npm/node-gyp (`npm install -g node-gyp@latest`); recent versions bundle a fixed gyp.
- **Old pinned requirements**: relax the pin to a version that supports 3.12.

## Fix 3: use Python 3.11

For an old project you can't update, create its venv with 3.11:

```bash
python3.11 -m venv .venv
# or with uv:
uv venv --python 3.11
```

## In your own code

Replace distutils imports:

| Old | New |
|---|---|
| `distutils.version.LooseVersion` | `packaging.version.Version` |
| `distutils.util.strtobool` | write a small helper (it's 5 lines) |
| `distutils.dir_util.copy_tree` | `shutil.copytree(src, dst, dirs_exist_ok=True)` |
| `distutils.spawn.find_executable` | `shutil.which` |
| `from distutils.core import setup` | `from setuptools import setup` |
