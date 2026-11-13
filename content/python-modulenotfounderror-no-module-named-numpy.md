---
error: "ModuleNotFoundError: No module named 'numpy'"
error_full: |
  Traceback (most recent call last):
    File "script.py", line 1, in <module>
      import numpy as np
  ModuleNotFoundError: No module named 'numpy'
cat: python
description: "NumPy isn't installed in the Python environment running your code, or it's installed in a different interpreter, venv or Jupyter kernel."
tldr: "Run `python -m pip install numpy` with the same `python` you use to run the script (activate your venv first). In Jupyter use `%pip install numpy`. With conda: `conda install numpy`. Check with `python -c \"import numpy; print(numpy.__file__)\"`."
keywords: python modulenotfounderror no module named numpy pip install numpy import numpy as np conda jupyter kernel venv vscode interpreter
related: [python-modulenotfounderror-no-module-named, python-modulenotfounderror-no-module-named-sklearn, python-externally-managed-environment]
---
## What it means

NumPy is a third-party package. Python searched the `site-packages` of the interpreter that is running and didn't find it. Usually it's either not installed at all, or installed for a *different* Python.

Check which Python you are using:

```bash
python -c "import sys; print(sys.executable)"
python -m pip show numpy
```

## Cause 1: not installed

```bash
python -m pip install numpy
```

Use `python3 -m pip` on Linux/macOS if `python` isn't Python 3, or `py -m pip install numpy` on Windows. Installing via `python -m pip` avoids the classic mismatch where `pip` belongs to another Python.

## Cause 2: wrong environment (venv, conda, multiple Pythons)

```bash
source .venv/bin/activate       # Windows: .venv\Scripts\activate
python -m pip install numpy
```

With conda, install into the active env:

```bash
conda activate myenv
conda install numpy
```

If `which python` (or `where python` on Windows) points somewhere unexpected, your shell isn't using the env you think.

## Cause 3: Jupyter kernel is a different Python

`!pip install numpy` in a notebook can install into the wrong environment. Use the magic, which targets the running kernel:

```python
%pip install numpy
```

Then restart the kernel. Or register your venv as a kernel:

```bash
python -m pip install ipykernel
python -m ipykernel install --user --name myenv
```

## Cause 4: IDE interpreter

VS Code: `Ctrl+Shift+P` → *Python: Select Interpreter*. PyCharm: Settings → Project → Python Interpreter. Pick the environment where NumPy is installed.

## Cause 5: running from inside the NumPy source tree, or a numpy.py file

A local file named `numpy.py` shadows the real package. If you cloned the NumPy repo, running Python from its root gives import errors too. Rename the file / `cd` elsewhere and clear `__pycache__`.

## Cause 6: install fails on a new Python version

Brand-new Python releases sometimes don't have NumPy wheels yet, so pip tries to compile from source and fails (see [failed building wheel](/python/python-failed-building-wheel/)). Upgrade pip first so it can find wheels, or use a supported Python version:

```bash
python -m pip install --upgrade pip
python -m pip install numpy
```

On system Python in Debian/Ubuntu, pip may be blocked by [externally-managed-environment](/python/python-externally-managed-environment/); use a venv or `sudo apt install python3-numpy`.

## Related: "numpy.core.multiarray failed to import"

That's a different problem — a package compiled against NumPy 1.x running on NumPy 2.x. Upgrade the dependent package (e.g. `pip install -U opencv-python pandas`) or pin `pip install "numpy<2"`.
