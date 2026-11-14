---
error: "A module that was compiled using NumPy 1.x cannot be run in NumPy 2.x"
error_full: |
  A module that was compiled using NumPy 1.x cannot be run in
  NumPy 2.0.0 as it may crash. To support both 1.x and 2.x
  versions of NumPy, modules must be compiled with NumPy 2.0.
  Some module may need to rebuild instead e.g. with 'pybind11>=2.12'.

  If you are a user of the module, the easiest solution will be to
  downgrade to 'numpy<2' or try to upgrade the affected module.
  We expect that some modules will need time to support NumPy 2.
  ...
  AttributeError: _ARRAY_API not found
  ImportError: numpy.core.multiarray failed to import
cat: python
description: "NumPy 2.0 changed its C ABI. A package with compiled extensions (opencv, torch, pandas, scipy, matplotlib, etc.) was built against NumPy 1.x and cannot load with NumPy 2 installed."
tldr: "Quick fix: `pip install \"numpy<2\"`. Better fix: upgrade the package named in the traceback to a release built for NumPy 2 (e.g. `pip install -U opencv-python pandas torch`). Pin `numpy<2` in requirements.txt if a dependency has no NumPy 2 build yet."
keywords: numpy 2 module compiled using numpy 1.x cannot be run in numpy 2.0 _array_api not found numpy.core.multiarray failed to import downgrade numpy<2 abi opencv torch pandas
related: [python-modulenotfounderror-no-module-named-numpy, python-modulenotfounderror-no-module-named-cv2, python-importerror-dll-load-failed]
---
## What it means

NumPy 2.0 (June 2024) broke binary compatibility with extension modules compiled against NumPy 1.x. Pure-Python code is fine, but any wheel with C/C++/Cython code that uses the NumPy C API must be rebuilt against NumPy 2.

When such an old wheel is imported while NumPy 2 is installed, NumPy prints this warning and the import then fails with errors such as `AttributeError: _ARRAY_API not found` or `ImportError: numpy.core.multiarray failed to import`.

The traceback lists which package triggered it. Look for the first non-NumPy import in the stack (for example `cv2`, `torch`, `pandas._libs`, `matplotlib`, `scipy`, `pyarrow`).

Check versions:

```bash
python -c "import numpy; print(numpy.__version__)"
pip list | grep -iE "numpy|pandas|opencv|torch|scipy|matplotlib|pyarrow"
```

## Fix 1: downgrade NumPy (fastest)

```bash
pip install "numpy<2"
```

With conda:

```bash
conda install "numpy<2"
```

This makes all old wheels work again. Pin it so the next install doesn't undo it:

```
# requirements.txt
numpy<2
```

## Fix 2: upgrade the package that was built for 1.x

Most popular libraries ship NumPy 2-compatible wheels now. Minimum versions that support NumPy 2:

| Package | Version |
|---|---|
| pandas | 2.2.2 |
| scipy | 1.13 |
| matplotlib | 3.8.4 |
| scikit-learn | 1.4.2 |
| opencv-python | 4.10.0.84 |
| torch | 2.3 |
| pyarrow | 16.0 |

```bash
pip install -U pandas scipy matplotlib scikit-learn opencv-python
```

Then confirm imports work:

```bash
python -c "import numpy, pandas, cv2; print(numpy.__version__, pandas.__version__, cv2.__version__)"
```

If `pip` refuses to upgrade because another package pins old versions, look at `pip check` output to see which one holds things back.

## Fix 3: start from a clean virtual environment

Mixed upgrades often leave one stale wheel. A fresh venv avoids guessing:

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -U pip
pip install -r requirements.txt
```

Make sure the error isn't coming from a different interpreter than the one you fixed: `python -c "import sys; print(sys.executable)"`.

## Fix 4: you maintain the extension

Rebuild against NumPy 2. By default, wheels built against NumPy 2 also run on older NumPy 1.x releases (controlled by `NPY_TARGET_VERSION`), so one build covers both:

```toml
# pyproject.toml
[build-system]
requires = ["setuptools", "numpy>=2.0"]
```

For pybind11 projects, use `pybind11>=2.12`. Run `ruff check --select NPY201` to find Python-level APIs removed in NumPy 2 (such as `np.float_`, `np.NaN`, `np.Inf`).

## Related: `np.float_` / `np.NaN` errors

If instead you see `AttributeError: np.NaN was removed in the NumPy 2.0 release`, your code (not a compiled module) uses removed aliases. Replace them: `np.NaN` → `np.nan`, `np.Inf` → `np.inf`, `np.float_` → `np.float64`, `np.complex_` → `np.complex128`.
