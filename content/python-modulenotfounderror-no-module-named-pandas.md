---
error: "ModuleNotFoundError: No module named 'pandas'"
error_full: |
  Traceback (most recent call last):
    File "analysis.py", line 1, in <module>
      import pandas as pd
  ModuleNotFoundError: No module named 'pandas'
cat: python
description: "pandas is not installed in the Python interpreter that is running your code. Usually it was installed into a different Python, virtualenv or conda env."
tldr: "Install it with the same interpreter that runs the script: `python -m pip install pandas` (or `py -m pip install pandas` on Windows, `conda install pandas` in conda). In Jupyter run `%pip install pandas` in a cell, then restart the kernel. In VS Code select the right interpreter."
keywords: python modulenotfounderror no module named pandas pip install pandas jupyter vscode interpreter venv conda import pandas as pd
related: [python-modulenotfounderror-no-module-named-numpy, python-modulenotfounderror-no-module-named, python-externally-managed-environment]
---
## What it means

Python searched every folder on `sys.path` for a package called `pandas` and didn't find one. Either pandas is not installed at all, or it is installed for a *different* Python than the one running your code. The second case is the usual one on machines with several Pythons (system, Homebrew, python.org, Anaconda, venvs).

See which interpreter is running:

```bash
python -c "import sys; print(sys.executable)"
```

## Fix 1: install with `python -m pip`

Always install through the interpreter you run, so pip and Python match:

```bash
python -m pip install pandas
```

| Platform | Command |
|---|---|
| Windows | `py -m pip install pandas` |
| macOS / Linux | `python3 -m pip install pandas` |
| Inside an activated venv | `python -m pip install pandas` |
| Anaconda / Miniconda | `conda install pandas` |

Verify:

```bash
python -c "import pandas; print(pandas.__version__, pandas.__file__)"
```

If pip itself is missing, see [pip: command not found](/python/python-pip-command-not-found/).

## Fix 2: `externally-managed-environment` on Debian/Ubuntu/macOS Homebrew

Newer system Pythons block `pip install` globally. Use a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install pandas
```

Or install the distro package: `sudo apt install python3-pandas`. Details on the [externally-managed-environment](/python/python-externally-managed-environment/) page.

## Fix 3: Jupyter Notebook / JupyterLab

The notebook kernel may use a different Python than your terminal. Install from inside the notebook:

```python
%pip install pandas
```

Then **Kernel → Restart**. `%pip` installs into the kernel's own environment (unlike `!pip`, which may use another one). Check with:

```python
import sys; print(sys.executable)
```

To use a venv as a kernel:

```bash
python -m pip install ipykernel
python -m ipykernel install --user --name myenv
```

## Fix 4: VS Code / PyCharm uses another interpreter

- **VS Code:** `Ctrl+Shift+P` → **Python: Select Interpreter** → pick the venv or conda env where pandas is installed. The interpreter is shown in the status bar.
- **PyCharm:** **Settings → Project → Python Interpreter**, choose the right one or click **+** and add `pandas`.

Running with the green "Run" button can use a different interpreter than your terminal.

## Fix 5: `sudo` or cron runs a different Python

`sudo python script.py` uses root's environment, and cron uses a minimal `PATH`. Call the venv's interpreter by full path:

```bash
/home/me/project/.venv/bin/python script.py
```

## Fix 6: a file named `pandas.py`

If the error changes to `AttributeError: module 'pandas' has no attribute 'DataFrame'` after installing, a local `pandas.py` (or a folder called `pandas`) is shadowing the library. Rename it and delete `__pycache__`.

## Install fails?

On a very new Python version a wheel may not exist yet, so pip tries to compile from source and fails. Upgrade pip first (`python -m pip install -U pip`) or use a Python version pandas supports. See [Failed building wheel](/python/python-failed-building-wheel/).
