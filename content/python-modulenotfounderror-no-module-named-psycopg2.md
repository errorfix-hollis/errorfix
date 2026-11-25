---
error: "ModuleNotFoundError: No module named 'psycopg2'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      import psycopg2
  ModuleNotFoundError: No module named 'psycopg2'
cat: python
description: "The PostgreSQL driver psycopg2 isn't installed in the Python environment that runs your code. Django, SQLAlchemy and Airflow raise it too when you use a postgresql:// database URL."
tldr: "Install the binary wheel: `python -m pip install psycopg2-binary` (no compiler or libpq needed). For production builds from source use `pip install psycopg2` after installing `libpq-dev` and `python3-dev`. Or switch to psycopg 3: `pip install \"psycopg[binary]\"` and use `postgresql+psycopg://` in SQLAlchemy."
keywords: python modulenotfounderror no module named psycopg2 psycopg2-binary pg_config executable not found libpq-dev django sqlalchemy postgresql driver psycopg3 docker
related: [python-modulenotfounderror-no-module-named, python-failed-building-wheel, db-postgres-connection-refused]
---
## What it means

`psycopg2` is the most common PostgreSQL adapter for Python. It isn't in the standard library, and the package you install has a different name from the module you import, which trips many people up:

| pip package | import as |
|---|---|
| `psycopg2-binary` | `import psycopg2` |
| `psycopg2` (source build) | `import psycopg2` |
| `psycopg[binary]` (v3) | `import psycopg` |

You also see this error indirectly: Django with `ENGINE: django.db.backends.postgresql`, or SQLAlchemy with a `postgresql://` URL, import psycopg2 for you.

## Fix 1: install the binary package

```bash
python -m pip install psycopg2-binary
python -c "import psycopg2; print(psycopg2.__version__)"
```

`psycopg2-binary` bundles libpq, so no compiler or PostgreSQL client libs are needed. Add it to `requirements.txt` too, so your deployment and Docker image get it.

## Fix 2: wrong interpreter or venv

If pip says *Requirement already satisfied* but the import still fails, pip and your app use different Pythons:

```bash
python -c "import sys; print(sys.executable)"
which pip   # Windows: where pip
```

Activate the venv first (`source .venv/bin/activate`), or select the right interpreter in your IDE, then reinstall with `python -m pip`. For Poetry: `poetry add psycopg2-binary`; for Pipenv: `pipenv install psycopg2-binary`.

## Fix 3: building `psycopg2` from source fails

`pip install psycopg2` (without `-binary`) compiles a C extension. Typical failure:

```
Error: pg_config executable not found.
```

Install the build dependencies, then retry:

```bash
# Debian/Ubuntu
sudo apt install libpq-dev python3-dev build-essential
# Fedora/RHEL
sudo dnf install libpq-devel python3-devel gcc
# macOS
brew install libpq && export PATH="$(brew --prefix libpq)/bin:$PATH"
# Alpine (Docker)
apk add --no-cache postgresql-dev gcc musl-dev
```

Or simply use `psycopg2-binary` unless you have a reason not to.

## Fix 4: Docker images

On `python:3.x-slim` the wheel works out of the box:

```dockerfile
FROM python:3.12-slim
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt   # contains psycopg2-binary
```

If the error appears only in the container, the package is missing from `requirements.txt` or you installed it on the host instead of in the image. Rebuild with `docker compose build --no-cache`.

## Fix 5: use psycopg 3 instead

New projects can use psycopg 3:

```bash
python -m pip install "psycopg[binary]"
```

- SQLAlchemy URL: `postgresql+psycopg://user:pass@host/db` (a plain `postgresql://` still means psycopg2).
- Django 4.2+ uses psycopg 3 automatically if installed, with the same `postgresql` engine.

## Related: `ImportError: ... libpq.so.5`

If the import fails with a shared-library error instead, libpq isn't present at runtime. Install `libpq5` (Debian) / `libpq` (Alpine), or use the `-binary` package.
