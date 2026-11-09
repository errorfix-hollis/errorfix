---
error: "ModuleNotFoundError: No module named 'cv2'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      import cv2
  ModuleNotFoundError: No module named 'cv2'
cat: python
description: "OpenCV is not installed in the Python interpreter that runs your script. The module is imported as cv2 but the pip package is called opencv-python."
tldr: "Install the package under its pip name with the same interpreter that runs your code: `python -m pip install opencv-python` (or `opencv-python-headless` on servers/Docker). Check with `python -c \"import cv2; print(cv2.__version__)\"`."
keywords: modulenotfounderror no module named cv2 opencv-python pip install cv2 opencv-python-headless import cv2 error jupyter venv conda
related: [python-modulenotfounderror-no-module-named, python-importerror-libgl-so-1-cannot-open-shared-object-file, python-pip-command-not-found]
---
## What it means

Python searched every directory on `sys.path` and found no `cv2` package. Almost always that's because OpenCV is not installed **for this interpreter** — either it was never installed, or it was installed into a different Python (system vs. venv vs. conda vs. Jupyter kernel).

The import name and the package name differ: you `import cv2`, but you install `opencv-python`. `pip install cv2` fails with "No matching distribution found".

## Fix 1: install the right package

```bash
python -m pip install opencv-python
```

Pick one of the four official wheels (install **only one** — they all provide `cv2` and conflict with each other):

| Package | Use when |
|---|---|
| `opencv-python` | Desktop, needs `cv2.imshow` windows |
| `opencv-python-headless` | Servers, Docker, CI — no GUI libraries |
| `opencv-contrib-python` | You need extra modules (`cv2.xfeatures2d`, `cv2.aruco`...) |
| `opencv-contrib-python-headless` | Contrib modules on a server |

If you have several installed, clean up first:

```bash
python -m pip uninstall -y opencv-python opencv-python-headless opencv-contrib-python opencv-contrib-python-headless
python -m pip install opencv-python-headless
```

## Fix 2: you installed it into a different Python

Using bare `pip` can target another interpreter. Compare:

```bash
which python; python -c "import sys; print(sys.executable)"
python -m pip --version     # shows which Python this pip belongs to
```

Always use `python -m pip install ...` with the exact `python` that runs your script. In a virtual environment, activate it first:

```bash
source .venv/bin/activate      # Windows: .venv\Scripts\activate
python -m pip install opencv-python
```

In VS Code, check the interpreter shown in the status bar (Ctrl+Shift+P → "Python: Select Interpreter") matches the venv.

## Fix 3: Jupyter notebook kernel

The notebook kernel may be a different Python than your terminal. Install from inside the notebook so it uses the kernel's interpreter:

```python
%pip install opencv-python
```

Then restart the kernel.

## Fix 4: conda environments

```bash
conda activate myenv
conda install -c conda-forge opencv
```

Don't mix the conda `opencv` package and pip `opencv-python` in the same environment.

## Fix 5: Raspberry Pi / Debian system Python

On Debian 12+, Ubuntu 23.04+ and Raspberry Pi OS Bookworm, `pip install` into the system Python is blocked (see [externally-managed-environment](/python/python-externally-managed-environment/)). Use the distro package:

```bash
sudo apt install python3-opencv
```

or create a venv and install `opencv-python` there.

## After installing: ImportError: libGL.so.1

If the error changes to `ImportError: libGL.so.1: cannot open shared object file`, the module is found but GUI system libraries are missing — switch to `opencv-python-headless` or install `libgl1`. See [the libGL.so.1 fix](/python/python-importerror-libgl-so-1-cannot-open-shared-object-file/).
