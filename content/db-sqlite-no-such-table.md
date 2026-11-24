---
error: "sqlite3.OperationalError: no such table"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 8, in <module>
      cur.execute("SELECT * FROM users")
  sqlite3.OperationalError: no such table: users
cat: database
description: "SQLite opened a database file that doesn't contain that table. Most often the code opened a different (new, empty) file than you expect because of a relative path, or the migrations/CREATE TABLE never ran on that file."
tldr: "Print the absolute path of the DB your code opens (`os.path.abspath('app.db')`) and check its tables with `sqlite3 app.db .tables`. Use an absolute path built from `__file__`, run your migrations (`python manage.py migrate`, `flask db upgrade`, `db.create_all()` inside an app context), and check table name spelling/case."
keywords: sqlite3 operationalerror no such table sqlite relative path empty database file django migrate flask sqlalchemy create_all app context in-memory database memory
related: [db-sqlite-database-is-locked, db-postgres-relation-does-not-exist, python-filenotfounderror-no-such-file-or-directory]
---
## What it means

`sqlite3.connect("app.db")` **creates an empty file** if none exists at that path. No error is raised there; the error only appears at the first query. So "no such table" usually means you are connected to the wrong file, not that your table vanished.

Check what the code actually opens:

```python
import os, sqlite3
path = "app.db"
print(os.path.abspath(path))
con = sqlite3.connect(path)
print(con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall())
```

And from the shell:

```bash
sqlite3 app.db ".tables"
sqlite3 app.db ".schema users"
```

## Cause 1: relative path resolves against the working directory

`"app.db"` is relative to the directory you *run* the program from, not to the script. Running from an IDE, cron, systemd or another folder creates a new empty DB elsewhere. Build the path from the script's location:

```python
from pathlib import Path
DB_PATH = Path(__file__).resolve().parent / "app.db"
con = sqlite3.connect(DB_PATH)
```

SQLAlchemy URLs: `sqlite:///app.db` (three slashes) is relative; `sqlite:////abs/path/app.db` (four) is absolute. In Flask-SQLAlchemy 3.x, a relative path is relative to the app's `instance/` folder, so the DB lives in `instance/app.db`.

Delete stray empty `app.db` files created by wrong paths to avoid confusion.

## Cause 2: tables were never created

- **Django**: `python manage.py makemigrations` then `python manage.py migrate`. For a new app, make sure it is in `INSTALLED_APPS`. Error `no such table: django_session` or `auth_user` = you never ran `migrate`.
- **Flask-SQLAlchemy**:

```python
with app.app_context():
    db.create_all()
```

Models must be imported before `create_all()`, or no tables are created. With Flask-Migrate: `flask db upgrade`.
- **Plain sqlite3**: run your `CREATE TABLE IF NOT EXISTS ...` at startup and `con.commit()`.

## Cause 3: in-memory or per-connection databases

`sqlite3.connect(":memory:")` gives every connection its own empty database. Tables created on one connection don't exist on another. Common in tests and with SQLAlchemy connection pools. Use one shared connection, a file, or with SQLAlchemy:

```python
from sqlalchemy.pool import StaticPool
engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
```

## Cause 4: wrong name

Check spelling, plural/singular (`user` vs `users`), and that Django tables are prefixed with the app name (`blog_post`, not `post`). If the table is in an attached database, qualify it: `SELECT * FROM other.users`.

## Cause 5: Docker or deployment

The DB file isn't in the image, or a volume mounts an empty directory over it. Run migrations as part of the container start, and store the DB on a named volume so it persists.
