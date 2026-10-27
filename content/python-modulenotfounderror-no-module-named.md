---
error: "ModuleNotFoundError: No module named"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      import requests
  ModuleNotFoundError: No module named 'requests'
cat: python
description: The Python running your code can't find the package. It's usually installed for a different Python or virtual environment.
tldr: "Install it with the same Python that runs your script: `python -m pip install requests` (use `python3` if that's what you run). In a virtual environment, activate it first."
keywords: modulenotfounderror no module named pip installed but not found vscode jupyter venv python3 import error
related: [python-externally-managed-environment, python-pip-command-not-found]
---
## What it means

Python searched every folder on `sys.path` for the module and didn't find it. Nine times out of ten the package **is installed, just for another Python**.

## Step 1: find out which Python runs your code

```bash
python -c "import sys; print(sys.executable)"
```

Then install into exactly that interpreter:

```bash
python -m pip install requests
```

Using `python -m pip` instead of bare `pip` guarantees the package goes to the same Python.

## Step 2: virtual environments

If your project has a `.venv` or `venv` folder, activate it before running or installing:

```bash
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## In VS Code

The status bar shows the selected interpreter. Use **Ctrl+Shift+P → Python: Select Interpreter** and choose your project's `.venv`. The integrated terminal and the Run button can use different interpreters if this is wrong.

## In Jupyter

The notebook kernel may be a different Python. Install from inside the notebook:

```python
%pip install requests
```

## The package name differs from the import name

| `import` name | `pip install` name |
|---|---|
| `cv2` | `opencv-python` |
| `PIL` | `pillow` |
| `sklearn` | `scikit-learn` |
| `yaml` | `pyyaml` |
| `bs4` | `beautifulsoup4` |
| `dotenv` | `python-dotenv` |
| `Crypto` | `pycryptodome` |
| `jwt` | `PyJWT` |

## Your own module isn't found

- Run from the project root: `python -m package.module` instead of `python package/module.py`.
- A folder you import from needs to be on the path; with packages, make sure you're not running a file from inside the package.
- Don't name your own file after a library (`requests.py`, `random.py`). It shadows the real one.

## Under sudo

`sudo python script.py` uses root's environment, which doesn't see packages installed with `--user` or in your venv. Use the venv's Python path explicitly: `sudo .venv/bin/python script.py`.
