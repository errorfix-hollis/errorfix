---
error: "AssertionError: Torch not compiled with CUDA enabled"
error_full: |
  Traceback (most recent call last):
    File "train.py", line 12, in <module>
      model = model.to("cuda")
    ...
  AssertionError: Torch not compiled with CUDA enabled
cat: python
description: "The installed PyTorch is a CPU-only build, so any .cuda() or .to(\"cuda\") call fails. A plain `pip install torch` on Windows or macOS gives you the CPU build; on macOS there is no CUDA at all."
tldr: "Check with `python -c \"import torch; print(torch.__version__, torch.version.cuda)\"` (CPU builds show `+cpu` / `None`). Reinstall a CUDA build using the command from pytorch.org, e.g. `pip uninstall -y torch torchvision torchaudio` then `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121`. On a Mac, use `\"mps\"` instead of `\"cuda\"`."
keywords: python pytorch assertionerror torch not compiled with cuda enabled torch.cuda.is_available false cpu only cu121 cu124 index-url pip install torch gpu nvidia mps mac
related: [python-modulenotfounderror-no-module-named-torch, python-cuda-out-of-memory, python-runtimeerror-cuda-error-device-side-assert-triggered]
---
## What it means

PyTorch is published in several builds: CPU-only, and builds for specific CUDA versions. The CPU build has no CUDA code inside, so moving a tensor or model to `"cuda"` raises this assertion. It is not a driver problem (a missing driver gives `torch.cuda.is_available() == False` with a CUDA build, but not this message).

Check what you have, using the same interpreter that runs your script:

```bash
python -c "import torch; print(torch.__version__, torch.version.cuda, torch.cuda.is_available())"
# 2.3.1+cpu None False        <- CPU build
# 2.3.1+cu121 12.1 True       <- CUDA build working
```

## Fix 1: install a CUDA build of PyTorch

On Windows the default `pip install torch` from PyPI is CPU-only. Uninstall and install from PyTorch's CUDA index. Pick the exact command for your OS and CUDA version from the selector on pytorch.org ("Get Started"); it looks like:

```bash
pip uninstall -y torch torchvision torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

Notes:

- The wheel bundles its own CUDA runtime, so you don't need the CUDA Toolkit installed, only a recent enough NVIDIA driver. Check the driver with `nvidia-smi` (the "CUDA Version" it shows is the highest the driver supports).
- Use `python -m pip` if you have several Pythons, so it installs into the right one.
- `pip` may keep the cached CPU wheel; uninstalling first avoids "requirement already satisfied".

## Fix 2: a dependency pulled in the CPU build again

Installing another package afterwards (or `pip install -r requirements.txt` with a plain `torch==x.y.z` line) can replace your CUDA build with the PyPI one. Pin the index in requirements:

```text
--extra-index-url https://download.pytorch.org/whl/cu121
torch==2.3.1+cu121
```

Re-run the version check after every install step in Docker images and CI.

## Fix 3: macOS has no CUDA

Macs don't have NVIDIA GPUs supported by PyTorch. On Apple Silicon, use the Metal backend:

```python
device = "mps" if torch.backends.mps.is_available() else "cpu"
model.to(device)
```

## Fix 4: write device-agnostic code

Code copied from tutorials often hard-codes `.cuda()`. Choose the device once and fall back to CPU:

```python
import torch

if torch.cuda.is_available():
    device = torch.device("cuda")
elif torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")

model = model.to(device)
x = x.to(device)
```

When loading checkpoints saved on a GPU machine, map them to the device you have:

```python
state = torch.load("model.pt", map_location=device)
```

## Fix 5: no NVIDIA GPU

AMD GPUs on Linux use the ROCm builds of PyTorch (also listed on pytorch.org), which still use the `"cuda"` device name. Intel and other GPUs have their own backends. If there is no supported GPU, run on CPU with Fix 4.
