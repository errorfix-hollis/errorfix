---
error: "FATAL: role \"username\" does not exist"
error_full: |
  psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL:  role "me" does not exist
cat: database
description: PostgreSQL has no database user (role) with that name. By default psql connects as your OS username. Connect as the postgres superuser and create the role, or pass the right user with -U.
tldr: "Create a role matching your login: `sudo -u postgres createuser --interactive` (or `sudo -u postgres psql -c \"CREATE ROLE me LOGIN CREATEDB;\"`), then `createdb me`. Or connect explicitly: `psql -U postgres -h localhost`."
keywords: postgres fatal role does not exist psql createuser createdb macos homebrew postgres.app docker POSTGRES_USER database does not exist
related: [db-postgres-password-authentication-failed, db-postgres-connection-refused]
---
## What it means

Without `-U`, `psql` uses your operating-system username as the PostgreSQL role, and a database with the same name. Fresh installs only have the `postgres` role, so `psql` as user `me` fails.

## Fix on Linux

```bash
sudo -u postgres createuser --interactive      # name: me, superuser? choose
sudo -u postgres createdb -O me me
psql                                            # now works
```

Or in SQL:

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE me WITH LOGIN PASSWORD 'secret' CREATEDB;
CREATE DATABASE me OWNER me;
```

## Fix on macOS (Homebrew)

Homebrew creates a superuser named after **your** macOS user, not `postgres`. So `role "postgres" does not exist` is the common error there:

```bash
createuser -s postgres
```

or connect with your own user: `psql -d postgres`.

## Fix with Docker

The superuser is whatever `POSTGRES_USER` was set to on **first** start (default `postgres`):

```bash
docker exec -it db psql -U postgres
```

Changing `POSTGRES_USER` later has no effect because the data directory already exists. Either create the role manually or remove the volume to re-initialize (this deletes the data):

```bash
docker compose down -v
```

## In application config

Check the username in your connection string, e.g. `postgresql://app:secret@localhost:5432/appdb`. ORMs (Django, Rails, Prisma) then need the database to exist too; `FATAL: database "appdb" does not exist` is fixed with `createdb -O app appdb`.
