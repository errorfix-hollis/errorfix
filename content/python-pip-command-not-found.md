---
error: "pip: command not found"
error_full: |
  bash: pip: command not found
cat: python
description: The pip command isn't on your PATH. Use python3 -m pip, or install pip for your Python.
tldr: "Use `python3 -m pip install <package>`. If that says `No module named pip`, install it: `sudo apt install python3-pip` (Debian/Ubuntu) or `python3 -m ensurepip --upgrade`."
keywords: pip command not found pip3 not recognized windows python -m pip ensurepip
related: [python-modulenotfounderror-no-module-named, python-externally-managed-environment]
---
## What it means

Your shell can't find a program called `pip`. Many systems only ship `pip3`, or pip is installed but its folder isn't on your PATH.

## Fix 1: use python -m pip

This always works when pip is installed for that Python, and it's the officially recommended way:

```bash
python3 -m pip --version
python3 -m pip install requests
```

On Windows: `py -m pip install requests`.

## Fix 2: try pip3

```bash
pip3 install requests
```

## Fix 3: install pip

```bash
# Debian / Ubuntu
sudo apt update && sudo apt install python3-pip

# Fedora
sudo dnf install python3-pip

# any OS, from Python itself
python3 -m ensurepip --upgrade
```

On Debian/Ubuntu 23.04+, installing packages with pip outside a virtual environment then gives `externally-managed-environment`. Use a venv (`python3 -m venv .venv`), which always includes pip.

## Windows: 'pip' is not recognized as an internal or external command

Python's `Scripts` folder isn't on PATH. Re-run the Python installer, choose **Modify**, and tick **Add Python to environment variables**, or use `py -m pip` which doesn't need PATH.

## macOS

The system Python doesn't include pip on recent macOS. Install Python from python.org or Homebrew (`brew install python`), then use `python3 -m pip`, ideally inside a virtual environment.
