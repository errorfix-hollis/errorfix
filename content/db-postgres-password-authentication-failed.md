---
error: "FATAL: password authentication failed for user \"postgres\""
error_full: |
  psql: error: connection to server at "localhost" (127.0.0.1), port 5432 failed: FATAL:  password authentication failed for user "postgres"
cat: database
description: PostgreSQL rejected the password for that user, or the user has no password set. Set one via sudo -u postgres psql and check pg_hba.conf.
tldr: "Log in as the OS postgres user: `sudo -u postgres psql`, then set a password: `ALTER USER postgres PASSWORD 'new-password';`. Connect again with `psql -h localhost -U postgres`."
keywords: postgres password authentication failed for user postgres psql pg_hba.conf peer authentication docker scram md5
related: [db-postgres-connection-refused, db-mysql-access-denied-for-user-root-localhost]
---
## What it means

The server found a rule in `pg_hba.conf` that requires a password (`scram-sha-256` or `md5`) for this connection, and the password didn't match. A freshly installed `postgres` user often has **no password at all**, so any password fails.

## Fix: set the password

On Linux, the `postgres` database user can log in without a password through the local socket ("peer" authentication):

```bash
sudo -u postgres psql
```

```sql
ALTER USER postgres PASSWORD 'a-strong-password';
```

Better for apps: create your own user and database:

```sql
CREATE USER app WITH PASSWORD 'a-strong-password';
CREATE DATABASE appdb OWNER app;
```

## Check pg_hba.conf

Find it with `sudo -u postgres psql -c 'SHOW hba_file;'`. Rules are checked top to bottom; the first match wins:

```text
# TYPE  DATABASE  USER  ADDRESS        METHOD
local   all       all                  peer
host    all       all   127.0.0.1/32   scram-sha-256
host    all       all   ::1/128        scram-sha-256
```

After editing, reload: `sudo systemctl reload postgresql`.

## Password encryption mismatch

If you upgraded from an old version, passwords stored as `md5` don't work with `scram-sha-256` rules. Set the password again after making sure `password_encryption = scram-sha-256` in `postgresql.conf`. Old client libraries that don't support SCRAM need upgrading.

## Docker

`POSTGRES_PASSWORD` only applies when the data volume is **empty** on first start. If you changed the variable afterwards, the old password still applies. Either use the old one, change it with `ALTER USER`, or remove the volume (this deletes your data):

```bash
docker compose down -v
```

## Special characters in connection URLs

In `postgresql://user:p@ss@host/db`, characters like `@`, `:`, `/`, `#` must be URL-encoded (`@` → `%40`), or the password is parsed wrong.

## "Peer authentication failed" instead?

That's `FATAL: Peer authentication failed for user "x"`: you used the socket with a database user whose name doesn't match your Linux user. Connect over TCP with `-h localhost` to use password auth, or run as the matching OS user.
