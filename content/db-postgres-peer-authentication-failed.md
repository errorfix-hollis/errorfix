---
error: "FATAL: Peer authentication failed for user \"postgres\""
error_full: |
  psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL:  Peer authentication failed for user "postgres"
cat: database
description: "You connected over the local Unix socket, where pg_hba.conf uses `peer` authentication: PostgreSQL only lets you in if your Linux username equals the database role name. Passwords are ignored for these connections."
tldr: "Run psql as the matching OS user: `sudo -u postgres psql`. For other roles, connect over TCP so password auth is used: `psql -h localhost -U myuser mydb` (apps: host `localhost`/`127.0.0.1`, not an empty host). Or change the `local` line in `pg_hba.conf` from `peer` to `scram-sha-256` and `sudo systemctl reload postgresql`."
keywords: postgres psql fatal peer authentication failed for user postgres pg_hba.conf local socket sudo -u postgres scram-sha-256 md5 ubuntu django rails
related: [db-postgres-password-authentication-failed, db-postgres-role-does-not-exist, db-postgres-connection-refused]
---
## What it means

`pg_hba.conf` decides *how* each connection authenticates. On Debian/Ubuntu (and many other packages) the default is:

```text
# TYPE  DATABASE  USER      ADDRESS        METHOD
local   all       postgres                 peer
local   all       all                      peer
host    all       all       127.0.0.1/32   scram-sha-256
host    all       all       ::1/128        scram-sha-256
```

`local` = Unix socket connections (what `psql` uses when you don't pass `-h`). With `peer`, the server asks the kernel which OS user opened the socket and only allows a role with the **same name**. So:

```bash
me$ psql -U postgres         # OS user "me" != role "postgres" -> Peer authentication failed
```

## Fix 1: run as the matching OS user

For the `postgres` superuser:

```bash
sudo -u postgres psql
sudo -u postgres createuser --pwprompt myuser
sudo -u postgres createdb -O myuser mydb
```

A role with your own Linux username also works with peer, without a password:

```bash
sudo -u postgres createuser --superuser "$USER"
createdb "$USER"
psql
```

## Fix 2: connect over TCP to use the password

Adding `-h localhost` makes psql use the `host` lines, which use password authentication:

```bash
psql -h localhost -U myuser -d mydb
```

Applications hit this when the host is empty or a socket path. Set it explicitly:

```python
# Django settings.py
DATABASES = {"default": {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": "mydb", "USER": "myuser", "PASSWORD": "...",
    "HOST": "localhost", "PORT": "5432",
}}
```

```yaml
# Rails config/database.yml
development:
  adapter: postgresql
  database: mydb
  username: myuser
  password: <%= ENV["DB_PASSWORD"] %>
  host: localhost
```

A URL like `postgresql://myuser:pw@localhost:5432/mydb` also uses TCP.

If that then fails with `password authentication failed`, the role has no password or a different one — set it with `sudo -u postgres psql -c "ALTER USER myuser WITH PASSWORD 'newpass';"`.

## Fix 3: change pg_hba.conf to password auth for local sockets

Find the file:

```bash
sudo -u postgres psql -c "SHOW hba_file;"
# e.g. /etc/postgresql/16/main/pg_hba.conf
```

Change the line for all users (keep `postgres` on peer so `sudo -u postgres psql` still works):

```text
local   all       postgres                 peer
local   all       all                      scram-sha-256
```

Use `md5` instead of `scram-sha-256` only for very old clients. Lines are matched top to bottom and the first match wins, so edit the existing line rather than appending one below it. Then reload:

```bash
sudo systemctl reload postgresql
```

## Fix 4: map OS users to roles (pg_ident.conf)

If an OS user must log in as a differently named role without a password, use a user map:

```text
# pg_ident.conf
# MAPNAME   SYSTEM-USERNAME   PG-USERNAME
appmap      deploy            appuser
```

```text
# pg_hba.conf
local   all   appuser   peer map=appmap
```

Reload PostgreSQL, then `deploy$ psql -U appuser mydb` works.
