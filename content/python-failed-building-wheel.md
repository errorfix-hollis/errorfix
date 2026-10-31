---
error: "error: Failed building wheel for X"
error_full: |
  Building wheel for psycopg2 (setup.py) ... error
  error: subprocess-exited-with-error
  × Building wheel for psycopg2 (pyproject.toml) did not run successfully.
  │ exit code: 1
  ERROR: Failed building wheel for psycopg2
  ERROR: Could not build wheels for psycopg2, which is required to install pyproject.toml-based projects
cat: python
description: pip couldn't find a prebuilt wheel for your Python version and platform, so it tried to compile the package from source and the compile failed, usually because a compiler or C headers are missing.
tldr: "Scroll up to the first real compiler error. Usually: upgrade build tools (`python -m pip install --upgrade pip setuptools wheel`), install a compiler and headers (`sudo apt install build-essential python3-dev`, plus the library's `-dev` package, e.g. `libpq-dev`), or use a Python version the package ships wheels for."
keywords: pip failed building wheel for could not build wheels subprocess-exited-with-error pyproject.toml-based projects python3-dev build-essential psycopg2 gcc
related: [python-microsoft-visual-cpp-required, python-could-not-find-a-version-that-satisfies-the-requirement, python-no-module-named-distutils]
---
## What it means

A *wheel* is a prebuilt package. When PyPI has no wheel matching your Python version, OS and CPU, pip downloads the source distribution and builds it locally. For packages with C/C++/Rust extensions that requires a compiler, Python headers and sometimes system libraries. "Failed building wheel" is only the summary; the real reason is printed **above** it.

Rerun with more output to find it:

```bash
pip install psycopg2 -v 2>&1 | grep -iE "error|fatal" | head -20
```

Typical lines: `gcc: command not found`, `fatal error: Python.h: No such file or directory`, `pg_config executable not found`, `error: can't find Rust compiler`.

## Fix 1: upgrade pip, setuptools and wheel

Old pip versions don't recognise newer wheel tags (e.g. `manylinux_2_28`) and fall back to building from source unnecessarily.

```bash
python -m pip install --upgrade pip setuptools wheel
pip install <package>
```

## Fix 2: install a compiler and Python headers

Debian/Ubuntu:

```bash
sudo apt update
sudo apt install build-essential python3-dev
```

Fedora/RHEL: `sudo dnf install gcc python3-devel`. Alpine: `apk add build-base python3-dev`. macOS: `xcode-select --install`. On Windows see the "Microsoft Visual C++ 14.0 or greater is required" page.

## Fix 3: install the system library the package wraps

| Package | Debian/Ubuntu packages |
|---|---|
| psycopg2 | `libpq-dev` |
| mysqlclient | `default-libmysqlclient-dev pkg-config` |
| lxml | `libxml2-dev libxslt1-dev` |
| Pillow | `libjpeg-dev zlib1g-dev` |
| cryptography (old versions) | `libssl-dev libffi-dev` |

Or use a binary alternative where one exists, e.g. `pip install psycopg2-binary`.

## Fix 4: your Python is too new (or too old)

Right after a new Python release, many packages don't publish wheels yet. Check the "Download files" list on the package's PyPI page for a `cp3XX` tag matching `python --version`. If there is none, either upgrade the package to a version that has one or use an older Python in a virtual environment:

```bash
pip install --upgrade <package>      # newer releases often add wheels
python3.12 -m venv .venv && . .venv/bin/activate
```

## Fix 5: Rust-based packages

Packages like `tokenizers`, `orjson` or `pydantic-core` need Rust when no wheel matches. Install it with `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`, open a new shell, and retry — but usually a newer package version or supported Python is the better fix.

## Fix 6: Alpine-based Docker images

`python:3.x-alpine` uses musl, and many packages only ship `manylinux` (glibc) wheels, so everything compiles. Switching to `python:3.x-slim` usually makes the error disappear and the build much faster.
