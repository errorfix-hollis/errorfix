---
error: "ModuleNotFoundError: No module named 'dotenv'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      from dotenv import load_dotenv
  ModuleNotFoundError: No module named 'dotenv'
cat: python
description: "The import name is dotenv but the package on PyPI is python-dotenv. Either it isn't installed, or it's installed into a different Python/virtualenv than the one running your code."
tldr: "Install the right package into the interpreter you run: `python -m pip install python-dotenv` (not `pip install dotenv`). Inside a venv, activate it first. If you installed `dotenv` by mistake, `pip uninstall dotenv` then install `python-dotenv`."
keywords: python modulenotfounderror no module named dotenv python-dotenv load_dotenv pip install .env file virtualenv venv import error
related: [python-modulenotfounderror-no-module-named, python-modulenotfounderror-no-module-named-yaml, python-externally-managed-environment]
---
## What it means

`from dotenv import load_dotenv` imports the module `dotenv`, which is provided by the PyPI package **`python-dotenv`**. Python can't find that module on its `sys.path`.

Three usual reasons: the package isn't installed, the wrong package was installed, or it was installed for a different Python.

## Fix 1: install `python-dotenv` (not `dotenv`)

```bash
python -m pip install python-dotenv
```

There is an unrelated, old package on PyPI called `dotenv`. If you installed that, remove it first because it can break the import:

```bash
python -m pip uninstall -y dotenv
python -m pip install python-dotenv
```

Add it to your dependencies so it's installed everywhere:

```text
# requirements.txt
python-dotenv>=1.0
```

Poetry: `poetry add python-dotenv`. uv: `uv add python-dotenv`. Pipenv: `pipenv install python-dotenv`.

## Fix 2: installed for a different interpreter

`pip` and `python` can point to different installations. Using `python -m pip` guarantees they match. Check:

```bash
python -c "import sys; print(sys.executable)"
python -m pip show python-dotenv
```

If `pip show` prints nothing, it's not installed for that interpreter.

**Virtualenv:** activate it before installing and running:

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install python-dotenv
```

**VS Code / PyCharm:** select the venv interpreter (VS Code: *Python: Select Interpreter*). The editor's Run button may use a different Python than your terminal.

**Jupyter:** install from inside the notebook so it goes to the kernel's Python:

```python
%pip install python-dotenv
```

On Debian/Ubuntu system Python you may get [externally-managed-environment](/python/python-externally-managed-environment/); use a venv, or `sudo apt install python3-dotenv`.

## Fix 3: Docker / deployment

The image needs the package too. Make sure it's in `requirements.txt` and the Dockerfile installs it:

```dockerfile
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```

In production you often don't need `.env` files at all: the platform sets real environment variables. You can make the import optional:

```python
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
```

## Fix 4: a local file shadows the module

A file named `dotenv.py` (or a folder `dotenv/`) in your project shadows the real package, usually giving `ImportError: cannot import name 'load_dotenv'`. Rename it and delete `__pycache__`.

## Check it works

```python
from dotenv import load_dotenv
import os
load_dotenv()                 # reads .env from the current dir or parents
print(os.getenv("MY_VAR"))
```

`load_dotenv()` doesn't override variables already set in the environment unless you pass `override=True`.
