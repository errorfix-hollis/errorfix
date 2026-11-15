---
error: "ModuleNotFoundError: No module named 'matplotlib'"
error_full: |
  Traceback (most recent call last):
    File "plot.py", line 1, in <module>
      import matplotlib.pyplot as plt
  ModuleNotFoundError: No module named 'matplotlib'
cat: python
description: "matplotlib is not installed in the Python interpreter or Jupyter kernel that runs your code. It was probably installed into a different Python or environment."
tldr: "Install with the interpreter that runs the code: `python -m pip install matplotlib` (Windows `py -m pip install matplotlib`, conda `conda install matplotlib`). In Jupyter run `%pip install matplotlib` in a cell and restart the kernel."
keywords: python modulenotfounderror no module named matplotlib pip install matplotlib import matplotlib.pyplot as plt jupyter kernel vscode conda mpl_toolkits
related: [python-modulenotfounderror-no-module-named-numpy, python-modulenotfounderror-no-module-named-pandas, python-modulenotfounderror-no-module-named]
---
## What it means

Python could not find a package named `matplotlib` on `sys.path`. Either it isn't installed, or it was installed for another Python: system vs Homebrew vs python.org vs Anaconda, or a venv. Notebooks make this more likely because the kernel often runs a different Python than your terminal.

```bash
python -c "import sys; print(sys.executable)"
```

## Fix 1: install with `python -m pip`

```bash
python -m pip install matplotlib
```

| Environment | Command |
|---|---|
| Windows | `py -m pip install matplotlib` |
| macOS / Linux | `python3 -m pip install matplotlib` |
| Conda | `conda install matplotlib` |
| Debian/Ubuntu system Python | `sudo apt install python3-matplotlib` |

Verify:

```bash
python -c "import matplotlib; print(matplotlib.__version__, matplotlib.__file__)"
```

If you get `externally-managed-environment`, create a venv first (`python3 -m venv .venv && source .venv/bin/activate`). See [that page](/python/python-externally-managed-environment/).

## Fix 2: Jupyter / JupyterLab / Colab

Install into the kernel's environment from inside the notebook:

```python
%pip install matplotlib
```

Then **Kernel → Restart Kernel**. `%pip` always targets the running kernel. `!pip` runs whatever `pip` is first on PATH, which may be a different Python. Check the kernel's interpreter with `import sys; sys.executable`.

To make a venv available as a kernel:

```bash
python -m pip install ipykernel
python -m ipykernel install --user --name myproject
```

## Fix 3: VS Code / PyCharm / Spyder

- **VS Code:** `Ctrl+Shift+P` → **Python: Select Interpreter**. For notebooks, use the kernel picker at the top right.
- **PyCharm:** **Settings → Project → Python Interpreter** → **+** → `matplotlib`.
- **Spyder:** it uses its own environment by default. Set **Preferences → Python interpreter** to yours, and install `spyder-kernels` there.

## Fix 4: `No module named 'mpl_toolkits'` or `'matplotlib.backends...'`

- `mpl_toolkits.mplot3d` and `mpl_toolkits.axes_grid1` ship with matplotlib. If they are missing, the install is broken or old. Reinstall: `python -m pip install --force-reinstall matplotlib`.
- `mpl_toolkits.basemap` is a separate, deprecated package (`pip install basemap`). Prefer `cartopy`.
- `No module named '_tkinter'` when you call `plt.show()` means Python was built without Tk. On Ubuntu: `sudo apt install python3-tk`. Or use a non-GUI backend: `import matplotlib; matplotlib.use("Agg")` and `plt.savefig("out.png")`.

## Fix 5: install fails on a brand-new Python

If pip starts compiling matplotlib from source (you see `Building wheel for matplotlib` and compiler errors), there is no prebuilt wheel for your Python version or platform yet. Upgrade pip (`python -m pip install -U pip`) and try again, or use a slightly older Python. See [Failed building wheel](/python/python-failed-building-wheel/).

## Fix 6: a file named `matplotlib.py`

A local `matplotlib.py` shadows the library and causes `No module named 'matplotlib.pyplot'; 'matplotlib' is not a package`. Rename the file and delete `__pycache__`.
