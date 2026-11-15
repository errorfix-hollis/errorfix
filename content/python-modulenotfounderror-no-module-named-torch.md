---
error: "ModuleNotFoundError: No module named 'torch'"
error_full: |
  Traceback (most recent call last):
    File "train.py", line 1, in <module>
      import torch
  ModuleNotFoundError: No module named 'torch'
cat: python
description: "PyTorch is not installed in the Python environment that runs your code. The pip package is called torch, and wheels exist only for supported Python versions and platforms."
tldr: "Install with the interpreter that runs the code: `python -m pip install torch` (add `torchvision torchaudio` if needed). For a specific CUDA build use the command from pytorch.org, e.g. `python -m pip install torch --index-url https://download.pytorch.org/whl/cu124`. In Jupyter use `%pip install torch` and restart the kernel."
keywords: python modulenotfounderror no module named torch pytorch pip install torch cuda index-url conda jupyter torchvision no matching distribution python version
related: [python-cuda-out-of-memory, python-could-not-find-a-version-that-satisfies-the-requirement, python-modulenotfounderror-no-module-named]
---
## What it means

Python found no package named `torch` on `sys.path`. Either PyTorch isn't installed in this environment, or it went into a different Python, conda env or Jupyter kernel. Check which interpreter runs your code:

```bash
python -c "import sys; print(sys.executable)"
```

The import is `torch`. On PyPI the package is also called `torch`. `pip install pytorch` is wrong: that name is a placeholder that doesn't install PyTorch.

## Fix 1: install with `python -m pip`

CPU or default build (on Linux the default PyPI wheel includes CUDA support):

```bash
python -m pip install torch torchvision torchaudio
```

For a specific CUDA version or a CPU-only build, use the selector on pytorch.org. It gives a command with an index URL:

```bash
# CPU only (much smaller download)
python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
# CUDA 12.4 build
python -m pip install torch --index-url https://download.pytorch.org/whl/cu124
```

Verify:

```bash
python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```

## Fix 2: "No matching distribution found for torch"

pip finds no wheel for your setup. Common reasons:

- **Python too new or too old.** PyTorch publishes wheels only for a range of recent Python versions, and a new Python release is often unsupported for a few months. Check `python --version` and use a supported version in a venv.
- **32-bit Python on Windows.** PyTorch needs 64-bit Python. Check with `python -c "import struct; print(struct.calcsize('P')*8)"`.
- **Unsupported platform**, e.g. old macOS on Intel, where newer releases no longer ship wheels.

See [Could not find a version that satisfies the requirement](/python/python-could-not-find-a-version-that-satisfies-the-requirement/).

## Fix 3: conda environments

Activate the environment before installing and before running:

```bash
conda create -n ml python=3.11
conda activate ml
python -m pip install torch torchvision
```

PyTorch no longer publishes new releases to its own `pytorch` conda channel, so pip inside the conda env is the recommended way. Avoid mixing two copies of torch (one from conda, one from pip) in one env.

## Fix 4: Jupyter, VS Code, Colab

- **Jupyter:** `%pip install torch` in a cell, then restart the kernel. Check `sys.executable` in the notebook.
- **VS Code:** **Python: Select Interpreter** (and the notebook kernel picker) → the env where torch is installed.
- **Colab** has torch preinstalled. If it's missing, the runtime was reset or you are on a custom runtime.

## Fix 5: it imports in the terminal but not in your script

- `sudo python train.py` or cron uses a different Python. Use the venv's binary by full path: `/home/me/proj/.venv/bin/python train.py`.
- A file or folder named `torch` in your project shadows the library. Rename it.
- `No module named 'torch._C'` means a broken or mixed install. Reinstall: `python -m pip uninstall -y torch && python -m pip install torch`.

## Related: `torch.cuda.is_available()` is False

That's not this error, but it often follows. You installed the CPU build, or the NVIDIA driver is missing or too old. Reinstall with the CUDA index URL from Fix 1 and check `nvidia-smi`.
