---
error: "ModuleNotFoundError: No module named 'tkinter'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      import tkinter as tk
  ModuleNotFoundError: No module named 'tkinter'
cat: python
description: "Tkinter is part of the standard library but it depends on the Tk C library, so many Linux distros, Homebrew and pyenv builds ship Python without it. It is not installed with pip."
tldr: "Install the system package, not pip: Debian/Ubuntu `sudo apt install python3-tk`, Fedora `sudo dnf install python3-tkinter`, Arch `sudo pacman -S tk`, macOS Homebrew `brew install python-tk@3.12` (match your version). On Windows re-run the installer and tick \"tcl/tk and IDLE\". On Python 2 the module is `Tkinter` (capital T)."
keywords: modulenotfounderror no module named tkinter _tkinter python3-tk pip install tkinter python-tk brew pyenv tcl tk Tkinter importerror libtk
related: [python-modulenotfounderror-no-module-named, python-command-not-found, python-externally-managed-environment]
---
## What it means

`tkinter` ships with CPython, but only if Python was built against Tcl/Tk. Distros split it into a separate package, and source builds (pyenv, asdf) skip it if Tk headers were missing at build time.

`pip install tkinter` does not work: there is no such PyPI package (`pip install tk` installs something unrelated).

Test which interpreter you are using and whether Tk loads:

```bash
python3 -c "import sys; print(sys.executable, sys.version)"
python3 -m tkinter        # opens a small test window if it works
```

## Fix 1: Debian / Ubuntu / Mint / WSL

```bash
sudo apt update
sudo apt install python3-tk
```

If you use a specific version from the deadsnakes PPA, install the matching one: `sudo apt install python3.12-tk`.

## Fix 2: Fedora / RHEL / Arch / Alpine

```bash
sudo dnf install python3-tkinter     # Fedora, RHEL, Rocky
sudo pacman -S tk                    # Arch
sudo apk add python3-tkinter         # Alpine
```

## Fix 3: macOS with Homebrew

Homebrew's Python is built without Tk; it lives in a separate formula per version:

```bash
python3 --version          # e.g. 3.12.x
brew install python-tk@3.12
```

The python.org installer for macOS includes Tk, so that is an alternative.

## Fix 4: pyenv / asdf / source builds

The Tk development headers must be present *before* building Python, then rebuild:

```bash
# Ubuntu/Debian
sudo apt install tk-dev
# macOS
brew install tcl-tk

pyenv uninstall 3.12.4
pyenv install 3.12.4
```

If the build finishes with a warning like `The necessary bits to build these optional modules were not found: _tkinter`, the headers still weren't found.

## Fix 5: Windows

Tk is an optional component in the python.org installer. Run the installer again (or Settings > Apps > Python > Modify), choose **Modify** and tick **tcl/tk and IDLE**.

## Fix 6: virtual environments and Docker

A venv uses the base interpreter's stdlib, so install Tk for the base Python, then recreate the venv if needed. In slim Docker images:

```dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends tk && rm -rf /var/lib/apt/lists/*
```

The official `python:` images already include `_tkinter`; you need the `tk` libs at runtime. Note that a GUI in a container also needs a display (`DISPLAY` / X11 forwarding), otherwise you get `_tkinter.TclError: no display name and no $DISPLAY environment variable`.

## Python 2 code

Old code uses `import Tkinter` and `import tkMessageBox`. In Python 3 those are `tkinter` and `tkinter.messagebox`.
