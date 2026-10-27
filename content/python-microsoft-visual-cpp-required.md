---
error: "error: Microsoft Visual C++ 14.0 or greater is required."
error_full: |
  error: Microsoft Visual C++ 14.0 or greater is required. Get it with "Microsoft C++ Build Tools": https://visualstudio.microsoft.com/visual-cpp-build-tools/
cat: python
description: pip is compiling a package from source on Windows and needs a C++ compiler. Usually there's no prebuilt wheel for your Python version. Use a supported Python version or install the Build Tools.
tldr: "First try getting a prebuilt wheel: `python -m pip install --upgrade pip` and use a Python version the package supports (often the newest Python is too new). Otherwise install *Microsoft C++ Build Tools* with the *Desktop development with C++* workload."
keywords: microsoft visual c++ 14.0 or greater is required pip install windows build tools wheel failed building wheel
related: [python-pip-command-not-found, python-modulenotfounderror-no-module-named]
---
## What it means

Packages with C/C++ extensions (numpy, pandas, lxml, psycopg2, pycryptodome…) are normally installed as prebuilt **wheels**. When pip can't find a wheel matching your Python version and platform, it downloads the source and tries to compile it, which on Windows needs Microsoft's C++ compiler.

## Fix 1: get a wheel instead (usually best)

```bash
python -m pip install --upgrade pip setuptools wheel
python -m pip install package-name
```

If it still compiles, check the package's PyPI page under *Download files*: is there a `.whl` for your Python (e.g. `cp313`) and for `win_amd64`? A brand-new Python release often doesn't have wheels yet for every package. Installing the previous Python version (e.g. 3.12 instead of 3.13) fixes it immediately.

Also check you're not using 32-bit Python by accident: `python -c "import struct; print(struct.calcsize('P')*8)"` should print 64.

## Fix 2: an alternative package

Some packages have a binary variant: `psycopg2-binary` instead of `psycopg2`, `opencv-python-headless`, etc.

## Fix 3: install the compiler

1. Download **Build Tools for Visual Studio** from Microsoft's site.
2. In the installer, select **Desktop development with C++** (it includes MSVC and the Windows SDK).
3. Restart the terminal and run `pip install` again.

## Fix 4: conda

conda-forge provides prebuilt binaries for many scientific packages: `conda install -c conda-forge package-name`.
