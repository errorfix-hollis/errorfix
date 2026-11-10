---
error: "ModuleNotFoundError: No module named 'PIL'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      from PIL import Image
  ModuleNotFoundError: No module named 'PIL'
cat: python
description: "The Pillow imaging library is not installed in the Python environment that runs your code. The import name is PIL, but the package you install is called Pillow."
tldr: "Install Pillow into the same interpreter that runs the script: `python -m pip install Pillow` (not `pip install PIL`, which does not exist for Python 3). In a venv, activate it first; in Jupyter, run `%pip install Pillow` in a cell and restart the kernel."
keywords: python modulenotfounderror no module named PIL pillow pip install pillow from PIL import Image importerror cannot import name image venv jupyter
related: [python-modulenotfounderror-no-module-named, python-modulenotfounderror-no-module-named-cv2, python-externally-managed-environment]
---
## What it means

`from PIL import Image` imports **Pillow**, the maintained fork of the old Python Imaging Library (PIL). The original `PIL` package was abandoned in 2011 and never supported Python 3. So the package name on PyPI (`Pillow`) is different from the import name (`PIL`), which is why this error trips people up.

Python searched every directory on `sys.path` of the *current interpreter* and found no `PIL` package.

## Cause 1: Pillow is not installed

```bash
python -m pip install Pillow
```

Then verify:

```bash
python -c "import PIL; print(PIL.__version__)"
```

Don't run `pip install PIL` — it fails with `No matching distribution found for PIL`. Also don't install `image` or `pil`; those are unrelated or empty packages.

## Cause 2: installed into a different Python

`pip` and `python` can point at different interpreters (system Python, Homebrew, pyenv, conda, a venv). Compare:

```bash
which python; python --version
python -m pip --version     # shows which Python this pip belongs to
```

Always using `python -m pip install ...` guarantees the package goes into the interpreter you then run. On Windows use `py -m pip install Pillow`.

If you use a virtual environment, activate it first:

```bash
source .venv/bin/activate        # Windows: .venv\Scripts\activate
python -m pip install Pillow
```

On Debian/Ubuntu 23.04+ a bare `pip install` outside a venv gives `externally-managed-environment`; use a venv or `sudo apt install python3-pil`. See [error: externally-managed-environment](/python/python-externally-managed-environment/).

## Cause 3: Jupyter / IDE uses another kernel

A notebook kernel often isn't the Python your terminal uses. Install from inside the notebook so it targets the running kernel:

```python
%pip install Pillow
```

Then restart the kernel. In VS Code or PyCharm, check the selected interpreter (bottom status bar / *Settings → Python Interpreter*) and install Pillow there.

## Cause 4: broken or conflicting install

If you previously installed the old `PIL` or `Imaging` package, or Pillow was half-uninstalled, reinstall cleanly:

```bash
python -m pip uninstall -y PIL Pillow
python -m pip install --no-cache-dir Pillow
```

With conda, prefer `conda install pillow` over mixing pip and conda in the same env.

## Cause 5: your own file is named PIL.py

A local `PIL.py` or `PIL/` folder in the project can shadow the real package and cause `ImportError: cannot import name 'Image' from 'PIL'`. Rename it and delete any `__pycache__` folder next to it.

## Docker

Add Pillow to `requirements.txt` (`Pillow>=10`) and install it in the image. On slim/Alpine images, prebuilt wheels usually work; if pip falls back to building from source you need `libjpeg` and `zlib` dev headers (`apk add jpeg-dev zlib-dev` on Alpine).
