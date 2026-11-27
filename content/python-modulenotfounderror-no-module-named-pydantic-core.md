---
error: "ModuleNotFoundError: No module named 'pydantic_core._pydantic_core'"
error_full: |
  Traceback (most recent call last):
    File "/var/task/app.py", line 1, in <module>
      from pydantic import BaseModel
    ...
    File "/var/task/pydantic_core/__init__.py", line 6, in <module>
      from ._pydantic_core import (
  ModuleNotFoundError: No module named 'pydantic_core._pydantic_core'
cat: python
description: "pydantic v2 depends on pydantic-core, a compiled Rust extension. This error means the installed binary doesn't match your Python version, OS or CPU architecture (very common on AWS Lambda and in Docker), or the package is missing."
tldr: "Reinstall in the same interpreter: `python -m pip install --force-reinstall pydantic pydantic-core`. For AWS Lambda, install wheels for the Lambda platform: `pip install --platform manylinux2014_x86_64 --only-binary=:all: --python-version 3.12 --target ./package pydantic` (use `manylinux2014_aarch64` for arm64)."
keywords: python modulenotfounderror no module named pydantic_core _pydantic_core pydantic v2 aws lambda docker arm64 x86_64 wheel platform mismatch fastapi
related: [python-modulenotfounderror-no-module-named, python-importerror-dll-load-failed, python-externally-managed-environment]
---
## What it means

`pydantic_core` is a Python package wrapping a compiled extension file, e.g. `_pydantic_core.cpython-312-x86_64-linux-gnu.so` (or `.pyd` on Windows). Python only loads it if the filename's Python version, OS and architecture match the running interpreter. If they don't, Python sees the `pydantic_core` folder but no loadable `_pydantic_core` module, and raises this error.

Check what you have:

```bash
python -c "import sys, platform; print(sys.version, platform.machine())"
ls "$(python -c 'import pydantic_core, os; print(os.path.dirname(pydantic_core.__file__))')"
```

(If the second command itself fails, look in `site-packages/pydantic_core/` manually.)

## Cause 1: built on one platform, run on another (AWS Lambda, Docker)

You ran `pip install -t package/` on macOS or Windows, zipped it, and deployed to Lambda (Linux). Or you installed on an x86_64 machine and the Lambda function / container runs on arm64 (Graviton, Apple Silicon images).

## Fix 1: install wheels for the target platform

```bash
pip install \
  --platform manylinux2014_x86_64 \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all: \
  --target ./package \
  pydantic
```

- Use `manylinux2014_aarch64` if the Lambda architecture is **arm64**.
- `--python-version` must match the Lambda runtime (`python3.12` → `3.12`).

Or build inside a matching container:

```bash
docker run --rm -v "$PWD":/var/task -w /var/task public.ecr.aws/lambda/python:3.12 \
  pip install -r requirements.txt -t package
```

With AWS SAM, `sam build --use-container` does this for you. In Lambda layers, put packages under `python/` in the zip.

## Cause 2: Python version changed

You upgraded Python (e.g. 3.11 → 3.12) or switched interpreters but kept the old virtual environment or `site-packages`. The `.so` is tagged for the old version.

## Fix 2: reinstall for the current interpreter

```bash
python -m pip install --force-reinstall --no-cache-dir pydantic pydantic-core
```

Use `python -m pip` so pip installs into the interpreter you actually run. If the venv was created by the old Python, recreate it:

```bash
rm -rf .venv
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

## Cause 3: mismatched pydantic and pydantic-core versions

Each pydantic release pins an exact pydantic-core version. Pinning `pydantic-core` separately in `requirements.txt` can install an incompatible one (this usually gives a `SystemError`/version error, but sometimes broken imports). Remove the explicit `pydantic-core` pin and let pydantic pull the right version:

```bash
pip install -U pydantic
pip show pydantic pydantic-core
```

## Cause 4: Docker image with a different libc

Wheels for `manylinux` (glibc) don't work on Alpine (`musllinux`). If you copy `site-packages` from a Debian build stage into an Alpine image, imports break. Install dependencies in the same base image you run, or use `python:3.12-slim` for both stages.

## Cause 5: a local file shadows the package

A file or folder named `pydantic_core` or `pydantic.py` in your project directory shadows the real package. Rename it.
