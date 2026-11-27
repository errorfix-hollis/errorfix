---
error: "No module named pip"
error_full: |
  /usr/bin/python3: No module named pip
  ModuleNotFoundError: No module named 'pip'
cat: python
description: "The Python interpreter you ran doesn't have pip installed (common on Debian/Ubuntu, in fresh virtual environments created without pip, or after a broken pip upgrade). Bootstrap it with ensurepip or install the OS package."
tldr: "Try `python3 -m ensurepip --upgrade` first. On Debian/Ubuntu install the package: `sudo apt install python3-pip` (and `python3-venv` for venvs). On Windows run `py -m ensurepip --upgrade`. If that's missing too, download https://bootstrap.pypa.io/get-pip.py and run `python3 get-pip.py`."
keywords: python no module named pip modulenotfounderror pip python -m pip ensurepip get-pip.py python3-pip ubuntu debian venv windows pip broken after upgrade
related: [python-pip-command-not-found, python-externally-managed-environment, python-no-module-named-distutils]
---
## What it means

`python -m pip` runs pip as a module *inside* that specific interpreter. "No module named pip" means pip isn't installed for that Python (its `site-packages` has no `pip` folder). Find out which interpreter you're using:

```bash
which -a python python3          # macOS/Linux
py -0p                           # Windows: lists installed Pythons
python3 -c "import sys; print(sys.executable, sys.version)"
```

## Fix 1: ensurepip (built into Python)

CPython ships a copy of pip that can be installed offline:

```bash
python3 -m ensurepip --upgrade
python3 -m pip --version
```

On Windows: `py -m ensurepip --upgrade`. If you get `No module named ensurepip`, your distribution removed it — see Fix 2.

## Fix 2: Debian / Ubuntu / WSL

Debian-based systems split pip and venv support into separate packages and disable `ensurepip` for the system Python:

```bash
sudo apt update
sudo apt install python3-pip python3-venv
```

For a specific version from the deadsnakes PPA: `sudo apt install python3.12-venv` and then create a venv, which includes pip. On Ubuntu 23.04+ / Debian 12+, installing packages into the system Python with pip is blocked (`externally-managed-environment`), so use a virtual environment:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install requests
```

Other distros: Fedora `sudo dnf install python3-pip`, Arch `sudo pacman -S python-pip`, Alpine `apk add py3-pip`.

## Fix 3: virtual environment created without pip

A venv created with `--without-pip`, or with Debian's Python while `python3-venv` was missing, has no pip. You might see `The virtual environment was not created successfully because ensurepip is not available`. Install `python3-venv` and recreate it:

```bash
rm -rf .venv
python3 -m venv .venv
.venv/bin/python -m pip --version
```

## Fix 4: get-pip.py

Works when nothing else does (e.g. custom builds, embedded Python):

```bash
curl -sSLO https://bootstrap.pypa.io/get-pip.py
python3 get-pip.py
```

For the Windows **embeddable** zip distribution, you also need to uncomment `import site` in the `python3XX._pth` file so installed packages are found.

## Cause: pip broke during an upgrade

If `pip install --upgrade pip` was interrupted (or ran as a different user), the old pip can be removed and the new one never installed. `python -m ensurepip --upgrade` or `get-pip.py` restores it. On Linux, avoid `sudo pip install --upgrade pip` on the system Python — it can conflict with the OS-managed pip.

## Cause: you are running a different Python than you think

`pip` installed for Python 3.11 doesn't help when you run `python3.12`. Always call pip through the interpreter you use: `python3.12 -m pip install ...`. In IDEs (VS Code, PyCharm), check the selected interpreter in the status bar.
