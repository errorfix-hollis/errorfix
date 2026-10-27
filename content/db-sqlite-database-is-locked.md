---
error: "sqlite3.OperationalError: database is locked"
cat: database
description: Another connection holds a write lock on the SQLite file. Commit or close other connections, enable WAL mode and set a busy timeout.
tldr: "Make sure every connection commits and closes promptly, then enable WAL mode (`PRAGMA journal_mode=WAL;`) and a busy timeout (`sqlite3.connect(path, timeout=30)`)."
keywords: sqlite database is locked operationalerror python django busy timeout wal mode concurrent writes
related: [python-keyerror]
---
## What it means

SQLite allows many readers but only **one writer at a time**, and the lock covers the whole database file. Your connection wanted to write (or, in the default rollback-journal mode, read during a write) and waited longer than its timeout.

## Fix 1: don't leave transactions open

The most common cause is a connection that started writing and never committed, often in another part of the same program, a forgotten Python shell, or a DB browser GUI with unsaved changes.

```python
with sqlite3.connect("app.db") as conn:
    conn.execute("INSERT INTO t VALUES (?)", (1,))
# the with-block commits; call conn.close() when you're done with the connection
```

Close tools like *DB Browser for SQLite* (or click *Write Changes*) while your app runs.

## Fix 2: WAL mode

Write-Ahead Logging lets readers keep reading while one writer writes:

```python
conn.execute("PRAGMA journal_mode=WAL;")
```

The setting is stored in the database file, so you only need to run it once.

## Fix 3: wait longer

```python
conn = sqlite3.connect("app.db", timeout=30)   # seconds; Python's default is 5
```

Django:

```python
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3",
                         "OPTIONS": {"timeout": 20}}}
```

## Fix 4: the file is on a network share

SQLite's locking doesn't work reliably on NFS, SMB or some Docker volume drivers (e.g. on macOS/Windows hosts). Keep the database on a local disk.

## When to move on from SQLite

If many processes write at the same time (multiple web workers, background jobs), consider PostgreSQL. For many apps, WAL mode plus short transactions is enough.
