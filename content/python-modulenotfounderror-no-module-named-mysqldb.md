---
error: "ModuleNotFoundError: No module named 'MySQLdb'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      import MySQLdb
  ModuleNotFoundError: No module named 'MySQLdb'
  django.core.exceptions.ImproperlyConfigured: Error loading MySQLdb module.
  Did you install mysqlclient?
cat: python
description: "The MySQLdb module is provided by the mysqlclient package, which isn't installed in the active environment (or failed to build). Django and SQLAlchemy's mysql:// dialect need it."
tldr: "Install the C build deps, then the package: on Ubuntu `sudo apt install python3-dev default-libmysqlclient-dev build-essential pkg-config` and `pip install mysqlclient`; on macOS `brew install mysql-client pkg-config` first. Or switch to the pure-Python driver: `pip install pymysql` and use `mysql+pymysql://` in SQLAlchemy."
keywords: python modulenotfounderror no module named mysqldb mysqlclient pip install mysqlclient django error loading mysqldb module pymysql sqlalchemy mysql_config not found
related: [python-modulenotfounderror-no-module-named, python-failed-building-wheel, python-modulenotfounderror-no-module-named-psycopg2]
---
## What it means

`import MySQLdb` comes from the **mysqlclient** package (a C extension; the import name differs from the package name). There is no package called `MySQLdb` to install for Python 3 — `pip install MySQLdb` fails, and the old `MySQL-python` package only supports Python 2.

Django's MySQL backend and SQLAlchemy URLs like `mysql://user:pw@host/db` import `MySQLdb`, so you'll see this error even if your code never imports it directly.

## Cause 1: mysqlclient is not installed

## Fix 1: install mysqlclient (with its build dependencies)

mysqlclient often has to compile against the MySQL/MariaDB client library, so install the headers first.

**Ubuntu / Debian:**

```bash
sudo apt install python3-dev default-libmysqlclient-dev build-essential pkg-config
pip install mysqlclient
```

**Fedora / RHEL:**

```bash
sudo dnf install python3-devel mysql-devel pkgconf-pkg-config gcc
pip install mysqlclient
```

**macOS (Homebrew):**

```bash
brew install mysql-client pkg-config
export PKG_CONFIG_PATH="$(brew --prefix)/opt/mysql-client/lib/pkgconfig"
pip install mysqlclient
```

**Windows:** recent versions publish prebuilt wheels, so `pip install mysqlclient` usually works without a compiler on supported Python versions.

**Alpine (Docker):**

```dockerfile
RUN apk add --no-cache mariadb-dev build-base pkgconf && pip install mysqlclient
```

If the build fails with `mysql_config not found` or `Can not find valid pkg-config name`, the dev package above is missing. See [Failed building wheel](/python/python-failed-building-wheel/) for general build errors.

## Cause 2: installed in a different environment

You installed mysqlclient with one Python and run the app with another (system Python vs venv, or a different interpreter in your IDE).

## Fix 2: install with the interpreter that runs the code

```bash
python -m pip install mysqlclient
python -c "import MySQLdb; print(MySQLdb.__file__)"
```

Activate the virtualenv first (`source .venv/bin/activate`), and in VS Code/PyCharm make sure the selected interpreter is that venv.

## Cause 3: you'd rather not compile anything

## Fix 3: use PyMySQL instead

PyMySQL is pure Python — no compiler or headers needed.

```bash
pip install pymysql
```

With SQLAlchemy, change the URL dialect:

```python
engine = create_engine("mysql+pymysql://user:pass@localhost/mydb")
```

With Django, make PyMySQL pose as MySQLdb in `settings.py` (or the project `__init__.py`):

```python
import pymysql
pymysql.install_as_MySQLdb()
```

Newer Django versions check the mysqlclient version; if you get `mysqlclient 1.4.3 or newer is required`, either install mysqlclient properly or set `pymysql.version_info = (2, 2, 1, "final", 0)` before `install_as_MySQLdb()`. Installing mysqlclient is the officially supported route.

## Cause 4: wrong case

The module name is case-sensitive: `import MySQLdb`, not `import mysqldb`.
