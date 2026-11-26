---
error: "ModuleNotFoundError: No module named 'jwt'"
error_full: |
  Traceback (most recent call last):
    File "auth.py", line 1, in <module>
      import jwt
  ModuleNotFoundError: No module named 'jwt'
cat: python
description: "The jwt module comes from the PyJWT package, which isn't installed in the Python environment running your code. Installing a package literally named jwt gives you a different, incompatible library."
tldr: "Install PyJWT into the same interpreter: `python -m pip install PyJWT` (not `pip install jwt`). If you installed `jwt` or `python-jwt` by mistake, `pip uninstall jwt python-jwt` first. Use `import jwt` and `jwt.encode(payload, key, algorithm=\"HS256\")`."
keywords: python modulenotfounderror no module named jwt pyjwt pip install pyjwt jwt.encode jwt.decode attributeerror module jwt has no attribute encode python-jose venv
related: [python-modulenotfounderror-no-module-named, python-attributeerror-module-has-no-attribute, python-pip-command-not-found]
---
## What it means

`import jwt` is provided by **PyJWT**. The package name on PyPI and the import name differ, so `pip install jwt` doesn't do what you expect: it installs an unrelated package (also importable as `jwt`) with a different API.

## Cause 1: PyJWT isn't installed

## Fix 1: install PyJWT with the right interpreter

```bash
python -m pip install PyJWT
python -c "import jwt; print(jwt.__version__, jwt.__file__)"
```

Using `python -m pip` guarantees the package goes into the interpreter you run. If you use a virtualenv, activate it first (`source .venv/bin/activate`, or `.venv\Scripts\activate` on Windows). In VS Code/PyCharm, select that venv as the interpreter.

For RS256/ES256 (public-key algorithms) you also need `cryptography`:

```bash
python -m pip install "PyJWT[crypto]"
```

Add it to your dependencies so deployments get it too:

```text
# requirements.txt
PyJWT>=2.8
```

## Cause 2: the wrong package was installed

If `import jwt` works but you get `AttributeError: module 'jwt' has no attribute 'encode'`, you have the `jwt` or `python-jwt` package instead of PyJWT, or both are installed and overwrite each other's files.

## Fix 2: remove the impostors, reinstall PyJWT

```bash
python -m pip uninstall -y jwt python-jwt PyJWT
python -m pip install PyJWT
```

Check with `pip show PyJWT` and `pip list | grep -i jwt`.

## Cause 3: a local file named jwt.py

A file `jwt.py` (or a folder `jwt/`) in your project shadows the library. You'll see `ImportError` or missing attributes, and `jwt.__file__` points to your file. Rename it (e.g. `jwt_utils.py`) and delete `__pycache__`.

## Cause 4: Docker / serverless image without the package

The package is installed locally but not in the container or Lambda bundle. Add it to `requirements.txt` and rebuild the image (`docker build --no-cache .`), or include it in the Lambda deployment package/layer.

## Using PyJWT 2.x correctly

The API changed in 2.0: `encode()` returns a `str` (not bytes), and `decode()` requires `algorithms`:

```python
import jwt

token = jwt.encode({"sub": "42"}, "secret", algorithm="HS256")
data = jwt.decode(token, "secret", algorithms=["HS256"])
```

Calling `token.decode("utf-8")` on 2.x fails with `AttributeError: 'str' object has no attribute 'decode'` — just drop the `.decode()`.

To inspect a token's header and payload without code, paste it into the [JWT decoder](/tools/jwt-decoder/).
