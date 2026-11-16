---
error: "ModuleNotFoundError: No module named 'seaborn'"
error_full: |
  Traceback (most recent call last):
    File "plot.py", line 2, in <module>
      import seaborn as sns
  ModuleNotFoundError: No module named 'seaborn'
cat: python
description: "The seaborn plotting library is not installed for the Python interpreter (or Jupyter kernel) that runs your code. It is not bundled with matplotlib or pandas."
tldr: "Install it into the same interpreter: `python -m pip install seaborn` (or `%pip install seaborn` inside Jupyter, then restart the kernel; `conda install seaborn` in conda). Verify with `python -c \"import seaborn; print(seaborn.__version__)\"`."
keywords: modulenotfounderror no module named seaborn pip install seaborn import seaborn as sns jupyter kernel anaconda conda vscode matplotlib
related: [python-modulenotfounderror-no-module-named-matplotlib, python-modulenotfounderror-no-module-named-pandas, python-modulenotfounderror-no-module-named]
---
## What it means

`import seaborn` searched every directory on `sys.path` and didn't find the package. Seaborn is a separate install — having matplotlib, pandas or numpy doesn't include it. Nearly always it's either not installed or installed for a different Python.

## Fix 1: install with the right interpreter

```bash
python -m pip install seaborn
python -c "import seaborn; print(seaborn.__version__)"
```

`python -m pip` installs into exactly the Python that `python` runs. If you run scripts with `python3` or `py`, use `python3 -m pip` / `py -m pip`. Seaborn pulls in numpy, pandas and matplotlib automatically.

Check which interpreter you're actually using:

```bash
python -c "import sys; print(sys.executable)"
python -m pip --version
```

## Fix 2: Jupyter Notebook / JupyterLab

The notebook kernel can be a different Python from your terminal. Install from a cell so it goes into the kernel's environment:

```python
%pip install seaborn
```

Then **restart the kernel** (Kernel → Restart). Avoid `!pip install`, which may use a different pip.

To check the kernel's interpreter:

```python
import sys; print(sys.executable)
```

## Fix 3: Anaconda / conda

```bash
conda activate myenv
conda install seaborn
# or from conda-forge
conda install -c conda-forge seaborn
```

If Jupyter is installed in `base` but your packages are in `myenv`, register the env as a kernel:

```bash
conda activate myenv
conda install ipykernel
python -m ipykernel install --user --name myenv
```

and pick "myenv" in the notebook's kernel menu.

## Fix 4: virtual environments and system Python

On Debian 12+/Ubuntu 23.04+ the system Python rejects pip (`externally-managed-environment`). Use a venv:

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install seaborn
```

Or install the distro package: `sudo apt install python3-seaborn`.

## Fix 5: VS Code / PyCharm uses another interpreter

- **VS Code**: Ctrl+Shift+P → "Python: Select Interpreter" → choose the venv or conda env where seaborn is installed. For notebooks, also pick the kernel in the top-right corner.
- **PyCharm**: Settings → Project → Python Interpreter → `+` → seaborn.

## Fix 6: a file named seaborn.py

If your own script is called `seaborn.py`, `import seaborn` imports your file instead (resulting in errors like `AttributeError: module 'seaborn' has no attribute 'set_theme'`). Rename it and delete `__pycache__/`.

## Version notes

- `sns.set()` still works but `sns.set_theme()` is the current name.
- `sns.distplot` was deprecated in 0.11 — use `sns.histplot` or `sns.displot`. If old tutorial code fails after installing, that's why.
- Built-in example datasets (`sns.load_dataset("tips")`) are downloaded from GitHub and need internet access.
