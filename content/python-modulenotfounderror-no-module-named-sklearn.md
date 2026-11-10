---
error: "ModuleNotFoundError: No module named 'sklearn'"
error_full: |
  Traceback (most recent call last):
    File "train.py", line 2, in <module>
      from sklearn.model_selection import train_test_split
  ModuleNotFoundError: No module named 'sklearn'
cat: python
description: "scikit-learn is not installed in the interpreter running your code. The import name is sklearn, but the package is called scikit-learn."
tldr: "Run `python -m pip install scikit-learn` (not `pip install sklearn`, which is a deprecated dummy package that now errors). In conda use `conda install scikit-learn`; in Jupyter run `%pip install scikit-learn` and restart the kernel."
keywords: python modulenotfounderror no module named sklearn scikit-learn pip install scikit-learn sklearn deprecated package jupyter conda venv
related: [python-modulenotfounderror-no-module-named, python-modulenotfounderror-no-module-named-pil, python-failed-building-wheel]
---
## What it means

You import `sklearn`, but the project on PyPI is called **scikit-learn**. Python could not find a `sklearn` package anywhere on the current interpreter's `sys.path`.

## Cause 1: scikit-learn is not installed

```bash
python -m pip install scikit-learn
python -c "import sklearn; print(sklearn.__version__)"
```

Do **not** use `pip install sklearn`. The `sklearn` package on PyPI was a placeholder that pulled in scikit-learn; since December 2023 installing it fails on purpose with:

```
The 'sklearn' PyPI package is deprecated, use 'scikit-learn' rather than 'sklearn' for pip commands.
```

If `sklearn` is listed in your `requirements.txt`, `setup.py` or `pyproject.toml`, replace it with `scikit-learn`. (Setting `SKLEARN_ALLOW_DEPRECATED_SKLEARN_PACKAGE_INSTALL=True` bypasses the check, but just fix the name.)

## Cause 2: wrong interpreter or environment

`pip` may install into a different Python than the one running the script:

```bash
which python && python -m pip --version
```

Use `python -m pip` (Windows: `py -m pip`) so both match. If you use a venv, activate it before installing and running:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install scikit-learn
```

## Cause 3: conda environments

Activate the environment first, then install from conda-forge or defaults:

```bash
conda activate myenv
conda install -c conda-forge scikit-learn
```

Running `python` from outside the activated env (e.g. an IDE pointing at base) will still fail.

## Cause 4: Jupyter kernel is a different Python

```python
import sys; print(sys.executable)
%pip install scikit-learn
```

Restart the kernel afterwards. If the notebook should use a venv, register it: `python -m ipykernel install --user --name myenv` and pick it in the kernel menu.

## Cause 5: install failed silently or needs a build

On very new Python versions, a wheel may not exist yet for the scikit-learn version pinned, so pip tries to compile from source and fails (see [Failed building wheel](/python/python-failed-building-wheel/)). Upgrade pip and allow a newer version:

```bash
python -m pip install --upgrade pip
python -m pip install --upgrade scikit-learn
```

Or use a Python version that has wheels available (check the scikit-learn release notes).

## Cause 6: a local file shadows it

A file named `sklearn.py` in your project directory gets imported instead of the library. Rename it and remove `__pycache__`.
