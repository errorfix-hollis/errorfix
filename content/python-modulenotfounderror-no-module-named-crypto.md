---
error: "ModuleNotFoundError: No module named 'Crypto'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      from Crypto.Cipher import AES
  ModuleNotFoundError: No module named 'Crypto'
cat: python
description: "The `Crypto` package is provided by PyCryptodome (the maintained replacement for the dead PyCrypto). Installing a package called `crypto` or `pycrypto` does not give you a working `Crypto` module on modern Python."
tldr: "Uninstall the wrong packages and install PyCryptodome into the same interpreter that runs your code: `python -m pip uninstall -y crypto pycrypto` then `python -m pip install pycryptodome`. Keep the import as `from Crypto.Cipher import AES`. If you want a separate namespace use `pip install pycryptodomex` and `from Cryptodome.Cipher import AES`."
keywords: python modulenotfounderror no module named crypto pycryptodome pycrypto pycryptodomex from crypto.cipher import aes pip install crypto lowercase windows
related: [python-modulenotfounderror-no-module-named, python-failed-building-wheel, python-externally-managed-environment]
---
## What it means

`import Crypto` (capital C) looks for a package directory called `Crypto`. Three different PyPI packages are involved, and only one is right today:

| PyPI package | Provides | Status |
|---|---|---|
| `pycryptodome` | `Crypto` | Maintained, drop-in replacement for PyCrypto |
| `pycryptodomex` | `Cryptodome` | Same code, separate namespace |
| `pycrypto` | `Crypto` | Dead since 2013, fails to build on Python 3.10+ |
| `crypto` | `crypto` (lowercase) | Unrelated command-line tool |

## Fix 1: install PyCryptodome

```bash
python -m pip uninstall -y crypto pycrypto
python -m pip install pycryptodome
```

Using `python -m pip` guarantees the package goes into the interpreter you run. Verify:

```bash
python -c "import Crypto; print(Crypto.__version__)"
```

Add `pycryptodome` (not `pycrypto`) to `requirements.txt`.

## Fix 2: leftover `crypto` or `pycrypto` breaks the folder name

If you installed `crypto` first, it may have created a lowercase `crypto` folder in `site-packages`. On case-insensitive filesystems (Windows, macOS) this can clash with `Crypto`. After uninstalling, check for stale folders:

```bash
python -c "import site; print(site.getsitepackages())"
```

Delete any leftover `crypto`/`Crypto` directory there, then reinstall `pycryptodome` with `--force-reinstall`.

## Fix 3: wrong interpreter or virtual environment

Installed but still missing? Your editor or script uses another Python:

```bash
which python; python -m pip show pycryptodome
```

In VS Code pick the venv via *Python: Select Interpreter*. In Jupyter run `%pip install pycryptodome` inside the notebook so it installs into the kernel's environment.

## Fix 4: use the separate namespace

If another library still depends on old PyCrypto, install `pycryptodomex` so both can coexist:

```bash
python -m pip install pycryptodomex
```

```python
from Cryptodome.Cipher import AES
from Cryptodome.Random import get_random_bytes

key = get_random_bytes(16)
cipher = AES.new(key, AES.MODE_GCM)
ciphertext, tag = cipher.encrypt_and_digest(b"secret data")
```

## API differences from PyCrypto

PyCryptodome is mostly compatible, but some old code needs small changes: `AES.new()` requires an explicit mode (`AES.MODE_GCM`, `AES.MODE_CBC`, ...), and keys and data must be `bytes`, not `str` (`b"..."` or `.encode()`). Prefer authenticated modes like GCM over ECB.

If you only need simple symmetric encryption, the `cryptography` package (`from cryptography.fernet import Fernet`) is another well-maintained option.
