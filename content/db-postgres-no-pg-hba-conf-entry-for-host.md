---
error: "FATAL: no pg_hba.conf entry for host"
error_full: |
  FATAL:  no pg_hba.conf entry for host "192.168.1.50", user "app", database "appdb", no encryption
  FATAL: no pg_hba.conf entry for host "10.0.0.5", user "app", database "appdb", SSL off
cat: database
description: "PostgreSQL received the connection, but no line in pg_hba.conf allows that combination of client IP, user, database and SSL mode. Add a matching rule, or connect with SSL if only hostssl rules exist."
tldr: "Find the file with `psql -c 'SHOW hba_file;'`, add a line such as `host appdb app 192.168.1.0/24 scram-sha-256`, then reload with `SELECT pg_reload_conf();` or `sudo systemctl reload postgresql`. On managed services (AWS RDS, Azure, Heroku) the fix is usually to connect with `sslmode=require`."
keywords: postgres postgresql fatal no pg_hba.conf entry for host user database no encryption ssl off hostssl sslmode=require scram-sha-256 md5 listen_addresses rds remote connection
related: [db-postgres-password-authentication-failed, db-postgres-connection-refused, db-postgres-peer-authentication-failed]
---
## What it means

`pg_hba.conf` (host-based authentication) is a list of rules checked top to bottom. Each rule matches a connection type, database, user and client address, and says how to authenticate. If no rule matches, the server rejects the connection with this error, before any password check.

The message tells you exactly what didn't match: the client IP, user, database, and whether SSL was used (`no encryption` / `SSL off`).

Since the server answered, networking and `listen_addresses` are already fine. (If they weren't, you'd get `Connection refused` or a timeout.)

## Fix 1: add a rule for the client

Find the file:

```bash
sudo -u postgres psql -c 'SHOW hba_file;'
# e.g. /etc/postgresql/16/main/pg_hba.conf  or  /var/lib/pgsql/data/pg_hba.conf
```

Add a line (format: `TYPE DATABASE USER ADDRESS METHOD`):

```
# allow user app to db appdb from the local network
host    appdb    app    192.168.1.0/24    scram-sha-256
# a single host
host    appdb    app    192.168.1.50/32   scram-sha-256
```

Rules are matched in order, so put specific rules above any broad `reject` rule. Then reload (no restart needed):

```bash
sudo -u postgres psql -c 'SELECT pg_reload_conf();'
# or
sudo systemctl reload postgresql
```

Check for typos: `SELECT * FROM pg_hba_file_rules WHERE error IS NOT NULL;` (PostgreSQL 10+).

Need help with the CIDR mask? Use the [subnet calculator](/tools/subnet-calculator/). Avoid `0.0.0.0/0` with `trust`: that lets anyone in without a password.

## Fix 2: the server only allows SSL (managed databases)

`no encryption` / `SSL off` plus a server that only has `hostssl` rules (AWS RDS with `rds.force_ssl=1`, Azure, Heroku, Supabase, many cloud providers) means you must connect with TLS:

```bash
psql "host=db.example.com dbname=appdb user=app sslmode=require"
```

```
postgresql://app:pass@db.example.com:5432/appdb?sslmode=require
```

In Node `pg`: `ssl: { rejectUnauthorized: false }` (or provide the CA). In JDBC: `?sslmode=require`.

## Fix 3: Docker and container networks

From another container, the client IP is the Docker bridge address (e.g. `172.18.0.5`), not `127.0.0.1`. The official `postgres` image adds `host all all all scram-sha-256` when `POSTGRES_PASSWORD` is set; a custom `pg_hba.conf` may lack it. Add the Docker subnet:

```
host    all    all    172.16.0.0/12    scram-sha-256
```

## Fix 4: wrong database or user name

The rule might exist for `appdb` but you connected to `postgres` (the default when no database is given). Compare the names in the error with your rule; use `all` to match any.

## Next error

Once a rule matches, you may see `password authentication failed`: that's the password or the `md5`/`scram-sha-256` method. See the related page.
