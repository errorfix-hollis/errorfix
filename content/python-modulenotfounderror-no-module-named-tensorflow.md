---
error: "ModuleNotFoundError: No module named 'tensorflow'"
error_full: |
  Traceback (most recent call last):
    File "train.py", line 1, in <module>
      import tensorflow as tf
  ModuleNotFoundError: No module named 'tensorflow'
cat: python
description: "TensorFlow is not installed for the Python interpreter running your code — often because your Python version is newer than the latest TensorFlow wheels, or pip installed it into another environment."
tldr: "Check your Python version (`python --version`) — TensorFlow only ships wheels for 64-bit CPython 3.9-3.12 (3.13 needs TF 2.20+). Then install with the same interpreter: `python -m pip install tensorflow` (Linux GPU: `python -m pip install \"tensorflow[and-cuda]\"`). Verify: `python -c \"import tensorflow as tf; print(tf.__version__)\"`."
keywords: modulenotfounderror no module named tensorflow pip install tensorflow could not find a version python 3.13 keras jupyter conda venv apple silicon tensorflow-macos
related: [python-modulenotfounderror-no-module-named, python-could-not-find-a-version-that-satisfies-the-requirement, python-modulenotfounderror-no-module-named-torch]
---
## What it means

Python could not find a `tensorflow` package on `sys.path`. Either it was never installed successfully, or it was installed into a different interpreter (system Python vs. venv vs. conda vs. Jupyter kernel).

TensorFlow is stricter than most packages: it only publishes wheels for specific Python versions and 64-bit platforms. If no wheel matches, `pip install tensorflow` fails with `ERROR: No matching distribution found for tensorflow`, and the later import fails with this error.

## Fix 1: use a supported Python version

```bash
python --version
python -c "import struct; print(struct.calcsize('P') * 8, 'bit')"
```

As a rule of thumb, TensorFlow supports the four or so Python releases before the newest one, and support for a brand new Python arrives months later. TF 2.16-2.19 support Python 3.9-3.12; Python 3.13 support came with TF 2.20. 32-bit Python is never supported. Check the current table at tensorflow.org/install/pip.

If your Python is too new, create a venv with a supported version:

```bash
# Ubuntu, e.g. with deadsnakes or pyenv
pyenv install 3.12
pyenv local 3.12
python -m venv .venv && source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install tensorflow
```

Upgrading pip matters: old pip versions don't recognise newer wheel tags and report "no matching distribution".

## Fix 2: install into the interpreter that runs your script

```bash
which python
python -m pip --version        # which Python this pip belongs to
python -m pip install tensorflow
python -c "import tensorflow as tf; print(tf.__version__)"
```

Always prefer `python -m pip` over a bare `pip`. On Debian/Ubuntu 23.04+ installing into the system Python is blocked (`externally-managed-environment`) — use a venv as above.

## Fix 3: GPU and platform-specific packages

| Platform | Install |
|---|---|
| Linux / WSL2 with NVIDIA GPU | `python -m pip install "tensorflow[and-cuda]"` |
| Linux / Windows CPU | `python -m pip install tensorflow` |
| macOS Apple Silicon | `python -m pip install tensorflow` (TF 2.13+); add `tensorflow-metal` for GPU |
| Windows native GPU | not supported after TF 2.10 — use WSL2 |

The old names `tensorflow-gpu` and (for TF 2.13+) `tensorflow-macos` are deprecated; installing them on current versions fails or installs an outdated release.

## Fix 4: Jupyter / VS Code use a different kernel

Install from inside the notebook so it targets the kernel's Python:

```python
%pip install tensorflow
```

Then restart the kernel. In VS Code, select the venv interpreter (Ctrl+Shift+P → "Python: Select Interpreter").

## Fix 5: conda environments

```bash
conda create -n tf python=3.11
conda activate tf
python -m pip install tensorflow
```

Google recommends installing TensorFlow with pip even inside conda; mixing `conda install tensorflow` and pip often yields broken installs.

## Fix 6: a local file shadows the package

A file named `tensorflow.py` (or a folder `tensorflow/`) in your project shadows the real package and causes confusing import errors. Rename it and delete `__pycache__`.

## Keras 3 note

If the error mentions `tensorflow` when you only imported `keras`, Keras 3 needs a backend: install `tensorflow` (or set `KERAS_BACKEND=jax`/`torch` and install that).
