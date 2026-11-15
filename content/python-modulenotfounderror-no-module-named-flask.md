---
error: "ModuleNotFoundError: No module named 'flask'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      from flask import Flask
  ModuleNotFoundError: No module named 'flask'
cat: python
description: "Flask is not installed in the Python interpreter that runs your app. Usually it went into another Python or a virtualenv that isn't active."
tldr: "Activate your venv and install with the same interpreter: `python -m pip install Flask` (Windows: `py -m pip install Flask`). Start the app with `python -m flask run` so the server uses that interpreter. In VS Code pick the venv with Python: Select Interpreter."
keywords: python modulenotfounderror no module named flask pip install flask venv flask run vscode interpreter import flask flask_sqlalchemy flask_cors
related: [python-modulenotfounderror-no-module-named, python-modulenotfounderror-no-module-named-requests, python-externally-managed-environment]
---
## What it means

Python looked through every folder on `sys.path` and found no package called `flask`. Either Flask was never installed, or it was installed for a different interpreter. Flask projects nearly always use a virtual environment, so the usual cause is a venv that isn't active, or an editor running the system Python.

Check which Python runs your code:

```bash
python -c "import sys; print(sys.executable)"
```

The pip package is named `Flask` and you import it as `flask`. pip doesn't care about case, Python does: `import Flask` fails even after installing.

## Fix 1: create/activate a venv and install with `python -m pip`

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
python -m pip install Flask
python -c "import flask, importlib.metadata as m; print(m.version('flask'))"
```

Running `python -m pip` means pip installs into the interpreter you are actually using. A bare `pip` can belong to another Python.

On Debian/Ubuntu and Homebrew, installing outside a venv fails with [externally-managed-environment](/python/python-externally-managed-environment/). Use a venv as shown above.

## Fix 2: `flask run` uses another Python

The `flask` command is a small script tied to the Python it was installed with. If an old global Flask exists, `flask run` may start that one, or the command is missing. Run it through your interpreter:

```bash
python -m flask --app app run --debug
```

Check which one runs with `which flask` (Windows: `where flask`). Inside an active venv it should point into `.venv`.

## Fix 3: extensions are separate packages

`No module named 'flask_sqlalchemy'`, `'flask_cors'`, `'flask_login'` etc. mean the *extension* is missing, not Flask:

| Import | Install |
|---|---|
| `flask_sqlalchemy` | `python -m pip install Flask-SQLAlchemy` |
| `flask_cors` | `python -m pip install flask-cors` |
| `flask_login` | `python -m pip install Flask-Login` |
| `flask_wtf` | `python -m pip install Flask-WTF` |
| `flask_migrate` | `python -m pip install Flask-Migrate` |

Old tutorials use `from flask.ext.sqlalchemy import ...`. That form was removed in Flask 1.0. Use `from flask_sqlalchemy import SQLAlchemy`.

Put everything in `requirements.txt` and install with `python -m pip install -r requirements.txt`.

## Fix 4: VS Code / PyCharm picks the wrong interpreter

- **VS Code:** `Ctrl+Shift+P` → **Python: Select Interpreter** → choose `.venv`. Open a new terminal afterwards so it activates the venv.
- **PyCharm:** **Settings → Project → Python Interpreter** → add the existing `.venv`.

## Fix 5: production (gunicorn, systemd, Docker)

- **gunicorn/uwsgi** must come from the same venv: `/srv/app/.venv/bin/gunicorn app:app`.
- **systemd:** set `ExecStart=` to the venv's binary. A unit file doesn't activate the venv for you.
- **Docker:** install requirements in the image (`RUN pip install -r requirements.txt`), and check the `CMD` doesn't call a different Python.

## Fix 6: a file named `flask.py`

If you named your own script `flask.py`, `from flask import Flask` imports your file and fails with `ImportError: cannot import name 'Flask'`. Rename it and delete `__pycache__`.
