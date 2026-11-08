---
error: "ImportError: DLL load failed while importing"
error_full: |
  ImportError: DLL load failed while importing _multiarray_umath: The specified module could not be found.
  ImportError: DLL load failed while importing QtCore: The specified procedure could not be found.
  OSError: [WinError 126] The specified module could not be found. Error loading "...\torch\lib\c10.dll" or one of its dependencies.
cat: python
description: "On Windows, a compiled Python extension (.pyd) or one of the DLLs it depends on could not be loaded. Usually a missing Visual C++ runtime, a broken or mixed install, or a 32/64-bit or Python-version mismatch."
tldr: "Install the latest Microsoft Visual C++ Redistributable (x64), then reinstall the package in a clean virtual environment: `python -m venv .venv`, `.venv\\Scripts\\activate`, `pip install --force-reinstall --no-cache-dir <package>`. Don't mix conda and pip installs of the same package."
keywords: python importerror dll load failed while importing the specified module could not be found winerror 126 numpy torch pyqt5 cv2 windows visual c++ redistributable
related: [python-microsoft-visual-cpp-required, python-modulenotfounderror-no-module-named, python-importerror-libgl-so-1-cannot-open-shared-object-file]
---
## What it means

Python found the module (so it is *not* `ModuleNotFoundError`), but Windows refused to load the native `.pyd` file behind it. The message "The specified module could not be found" is misleading: the `.pyd` itself exists, but a **DLL it depends on** is missing or incompatible. "The specified procedure could not be found" means a DLL was found but it is the wrong version.

Typical victims: numpy, scipy, pandas, torch, PyQt5/PySide, opencv (`cv2`), psycopg2, lxml.

## Cause 1: Visual C++ runtime missing

Most wheels are built with MSVC and need `vcruntime140.dll`, `msvcp140.dll` and friends. Fresh Windows installs and slim VMs often lack them.

**Fix:** install the latest "Microsoft Visual C++ Redistributable for Visual Studio 2015-2022" (x64) from Microsoft's site, or:

```powershell
winget install Microsoft.VCRedist.2015+.x64
```

Restart the terminal and try again. For PyTorch this fixes most `WinError 126 ... c10.dll` errors.

## Cause 2: broken or mixed installation

Upgrading one package with pip while another was installed by conda (or a different pip) leaves DLLs from different builds side by side.

**Fix:** reinstall cleanly, ideally in a fresh venv:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install --upgrade pip
pip install --force-reinstall --no-cache-dir numpy
```

In conda, install with one tool only:

```powershell
conda install numpy pandas      # not pip for the same packages
conda update --all
```

If you must use pip inside conda, install the native packages with conda first and only pure-Python ones with pip.

## Cause 3: wrong architecture or Python version

A 32-bit Python cannot load 64-bit DLLs and vice versa, and wheels are built per Python minor version. Check:

```powershell
python -c "import sys, platform; print(sys.version); print(platform.architecture())"
pip debug --verbose | findstr cp3
```

**Fix:** use 64-bit Python and a package version that ships wheels for your Python (very new Python releases often don't have them yet; use the previous minor version).

## Cause 4: a conflicting DLL earlier on PATH

Another program (an old Qt, Anaconda, Intel MKL, a GPU toolkit) puts its own copy of a DLL on `PATH`, and Windows loads that one instead.

**Fix:** run from a clean shell with a minimal `PATH`, or find the conflict:

```powershell
where Qt5Core.dll
where libiomp5md.dll
```

Remove the stray directory from `PATH`. Since Python 3.8, `PATH` is no longer searched for extension dependencies by default; packages call `os.add_dll_directory()` instead, so old advice to "add the folder to PATH" often doesn't help. In your own code:

```python
import os
os.add_dll_directory(r"C:\path\to\dlls")
import mymodule
```

## Cause 5: CPU or GPU runtime issues

- Very old CPUs without AVX can't load recent numpy/tensorflow builds.
- CUDA builds of torch/tensorflow need a matching NVIDIA driver. Install the CPU build to confirm: `pip install torch --index-url https://download.pytorch.org/whl/cpu`.

To see exactly which dependency is missing, run the "Dependencies" tool (open-source successor of Dependency Walker) on the `.pyd` file named in the traceback.
