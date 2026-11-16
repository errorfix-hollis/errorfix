---
error: "ModuleNotFoundError: No module named 'scipy'"
error_full: |
  Traceback (most recent call last):
    File "analysis.py", line 2, in <module>
      from scipy import stats
  ModuleNotFoundError: No module named 'scipy'
cat: python
description: "SciPy is not installed for the Python interpreter running your code. It is not part of the standard library and is not installed automatically by numpy."
tldr: "Run `python -m pip install scipy` with the same interpreter (activate your venv first), or `conda install scipy` in conda. Verify with `python -c \"import scipy; print(scipy.__version__)\"`. If pip tries to build from source, upgrade pip first: `python -m pip install --upgrade pip`."
keywords: modulenotfounderror no module named scipy pip install scipy scipy.stats sklearn dependency venv conda jupyter python version wheel
related: [python-modulenotfounderror-no-module-named-numpy, python-modulenotfounderror-no-module-named-sklearn, python-modulenotfounderror-no-module-named]
---
## What it means

Python searched `sys.path` and found no `scipy` package. Installing NumPy does not install SciPy; it's a separate package. If `scikit-learn` raises this error, your scikit-learn install is broken (SciPy is one of its dependencies) — reinstall both.

## Fix 1: install it with the interpreter that runs your code

```bash
python -m pip install scipy
python -c "import scipy; print(scipy.__version__)"
```

Using `python -m pip` guarantees the package goes into the same Python as `python`. A bare `pip` can belong to a different installation. Compare:

```bash
python -c "import sys; print(sys.executable)"
python -m pip --version
```

## Fix 2: use a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install numpy scipy
```

On recent Debian/Ubuntu, the system Python refuses `pip install` (`externally-managed-environment`). Either use a venv, or install the distro package: `sudo apt install python3-scipy`.

## Fix 3: pip tries to build SciPy from source and fails

If install output shows `Building wheel for scipy` followed by errors about Fortran, `gfortran`, `meson`, or `OpenBLAS`, pip didn't find a prebuilt wheel. Causes:

- **Old pip** that doesn't understand modern wheel tags — run `python -m pip install --upgrade pip`.
- **Brand-new Python** with no SciPy wheels yet — use the previous Python version, or wait for the next SciPy release.
- **32-bit Python** or an unusual platform (e.g. Alpine/musl in older SciPy versions) — use 64-bit Python, or a `python:3.x-slim` Docker image instead of Alpine.

Check whether a wheel exists for your setup:

```bash
python -m pip download scipy --only-binary=:all: --no-deps -d /tmp/x
```

## Fix 4: Jupyter or IDE uses another kernel

In a notebook:

```python
%pip install scipy
```

Restart the kernel afterwards. In VS Code pick the right interpreter via "Python: Select Interpreter"; in PyCharm install it under Settings → Project → Python Interpreter.

## Fix 5: conda

```bash
conda activate myenv
conda install scipy
```

Don't mix `conda install numpy` with `pip install scipy` in the same environment if you can avoid it; mismatched BLAS builds can crash at import.

## Fix 6: shadowing and partial installs

- A local file named `scipy.py` or a folder named `scipy/` hides the real package — rename it.
- `ImportError: cannot import name ... from scipy` or errors about `_ufuncs` after an interrupted install: reinstall cleanly:

```bash
python -m pip uninstall -y scipy
python -m pip install --no-cache-dir scipy
```

## Import tip

SciPy subpackages must usually be imported explicitly:

```python
import scipy
scipy.stats            # works on SciPy 1.9+ (lazy loading), AttributeError on older versions

from scipy import stats   # works everywhere
```
