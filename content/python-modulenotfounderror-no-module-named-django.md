---
error: "ModuleNotFoundError: No module named 'django'"
error_full: |
  Traceback (most recent call last):
    File "manage.py", line 11, in main
      from django.core.management import execute_from_command_line
  ModuleNotFoundError: No module named 'django'

  The above exception was the direct cause of the following exception:

  ImportError: Couldn't import Django. Are you sure it's installed and available on your PYTHONPATH environment variable? Did you forget to activate a virtual environment?
cat: python
description: "Django is not installed in the Python interpreter running manage.py. Usually the project's virtualenv isn't activated, or Django was installed for another Python."
tldr: "Activate the project's venv (`source .venv/bin/activate`, Windows `.venv\\Scripts\\activate`) and run `python -m pip install django` or `python -m pip install -r requirements.txt`. Then run `python manage.py runserver` with that interpreter. In production point gunicorn/uwsgi/mod_wsgi at the venv."
keywords: python modulenotfounderror no module named django couldn't import django are you sure it's installed pythonpath activate virtual environment pip install django manage.py runserver gunicorn
related: [python-modulenotfounderror-no-module-named, python-externally-managed-environment, python-modulenotfounderror-no-module-named-dotenv]
---
## What it means

`manage.py` tried to import Django and Python couldn't find it on `sys.path`. Django's `manage.py` catches that error and re-raises it as **"Couldn't import Django... Did you forget to activate a virtual environment?"** That hint is usually correct: the project's venv isn't active, so the system Python runs and has no Django.

```bash
python -c "import sys; print(sys.executable)"
```

If this doesn't print a path inside your project's venv, that's the problem.

## Fix 1: activate the venv

```bash
# macOS / Linux
source .venv/bin/activate        # or venv/bin/activate, env/bin/activate
# Windows PowerShell
.venv\Scripts\Activate.ps1
# Windows cmd
.venv\Scripts\activate.bat
```

Then run `python manage.py runserver`. With pipenv use `pipenv run python manage.py runserver`. With poetry use `poetry run python manage.py runserver`. With uv use `uv run manage.py runserver`.

On PowerShell, if activation is blocked with "running scripts is disabled", run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

## Fix 2: install Django (or the requirements)

```bash
python -m venv .venv && source .venv/bin/activate   # if there is no venv yet
python -m pip install -r requirements.txt           # existing project
python -m pip install django                        # new project
python -m django --version
```

Use `python -m pip` so pip and Python match. Install outside a venv on Debian/Ubuntu and you get [externally-managed-environment](/python/python-externally-managed-environment/).

## Fix 3: the venv was moved or Python was upgraded

A venv stores absolute paths. If you renamed the project folder, copied it to another machine, or upgraded Python (e.g. Homebrew 3.12 → 3.13), the venv's `python` may point at nothing or at an interpreter without Django. Recreate it:

```bash
rm -rf .venv
python3 -m venv .venv && source .venv/bin/activate
python -m pip install -r requirements.txt
```

Never commit the venv folder to git. Commit `requirements.txt` instead (`python -m pip freeze > requirements.txt`).

## Fix 4: the IDE uses another interpreter

- **VS Code:** `Ctrl+Shift+P` → **Python: Select Interpreter** → the project's `.venv`, then open a new terminal.
- **PyCharm:** **Settings → Project → Python Interpreter** → **Add Interpreter → Existing** → `.venv/bin/python`.

## Fix 5: production servers

The web server doesn't activate your venv:

- **gunicorn:** start the venv's binary, `/srv/site/.venv/bin/gunicorn mysite.wsgi:application`, in the systemd `ExecStart=`.
- **uWSGI:** set `home = /srv/site/.venv` (or `virtualenv =`).
- **Apache mod_wsgi:** `WSGIDaemonProcess mysite python-home=/srv/site/.venv python-path=/srv/site`. mod_wsgi must be built for the same Python version as the venv.
- **Docker:** make sure `pip install -r requirements.txt` runs in the image, and that `CMD` uses the same Python.

## Related errors

- `No module named 'mysite.settings'` or `'myapp'`: Django is installed, but the project folder isn't on the path. Run commands from the folder containing `manage.py`, and check `DJANGO_SETTINGS_MODULE`.
- `No module named 'rest_framework'` → `pip install djangorestframework`. `'corsheaders'` → `pip install django-cors-headers`. `'environ'` → `pip install django-environ`.
