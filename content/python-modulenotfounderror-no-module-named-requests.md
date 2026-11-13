---
error: "ModuleNotFoundError: No module named 'requests'"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 1, in <module>
      import requests
  ModuleNotFoundError: No module named 'requests'
cat: python
description: "requests is a third-party package, not part of the standard library. It isn't installed in the Python interpreter (or virtualenv) that is running your script."
tldr: "Install it into the interpreter you actually run: `python -m pip install requests` (or `python3 -m pip install requests`). If you use a venv, activate it first. On Debian/Ubuntu system Python, use a venv or `sudo apt install python3-requests`."
keywords: python modulenotfounderror no module named requests pip install requests import requests virtualenv venv python3 vscode interpreter jupyter
related: [python-modulenotfounderror-no-module-named, python-externally-managed-environment, python-pip-command-not-found]
---
## What it means

`import requests` looks for the package in the `site-packages` of the Python that is running. `requests` has shipped with Python 2 era distros and many tools, so people assume it is built in — it isn't. Python 3 needs it installed separately, *per interpreter*.

First find out which Python runs your code:

```bash
python -c "import sys; print(sys.executable)"
python -m pip --version     # shows which Python this pip belongs to
```

If those two paths disagree with where you ran `pip install`, that's the bug.

## Cause 1: it's simply not installed

```bash
python -m pip install requests
```

Use `python -m pip` instead of bare `pip`: it guarantees the package goes into the same interpreter that `python` starts. On systems where `python` is Python 2 or missing, use `python3 -m pip install requests`. On Windows, `py -m pip install requests`.

## Cause 2: installed in a different environment

Common with virtualenvs, conda and multiple Python versions:

```bash
# venv
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install requests
python main.py

# conda
conda activate myenv
conda install requests             # or: python -m pip install requests
```

If you installed with `pip3.11` but run `python3.12`, the package is invisible. Always install with the same interpreter: `python3.12 -m pip install requests`.

## Cause 3: VS Code / PyCharm / Jupyter uses another interpreter

The editor's "Run" button may use a different Python than your terminal.

- **VS Code**: `Ctrl+Shift+P` → *Python: Select Interpreter* → pick your `.venv`.
- **PyCharm**: Settings → Project → Python Interpreter.
- **Jupyter**: install into the kernel itself from a cell:

```python
%pip install requests
```

`%pip` (not `!pip`) targets the running kernel's environment.

## Cause 4: "externally-managed-environment" stopped the install

On Ubuntu 23.04+, Debian 12+ and recent Homebrew Python, `pip install requests` into the system Python is blocked, so it was never installed. Use a venv (Cause 2), `pipx` for CLI tools, or the distro package:

```bash
sudo apt install python3-requests
```

See [externally-managed-environment](/python/python-externally-managed-environment/).

## Cause 5: a file named requests.py

If your project has a file called `requests.py` (or a folder `requests/`), Python may import that instead, giving `ModuleNotFoundError` for submodules or `AttributeError: module 'requests' has no attribute 'get'`. Rename it and delete `__pycache__`.

## Cause 6: Docker image or CI doesn't install it

Add it to `requirements.txt` and install during build:

```dockerfile
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```

Verify the fix:

```bash
python -c "import requests; print(requests.__version__)"
```
