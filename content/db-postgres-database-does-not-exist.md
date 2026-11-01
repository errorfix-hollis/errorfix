---
error: "FATAL: database \"myapp\" does not exist"
error_full: |
  psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL:  database "myapp" does not exist
  django.db.utils.OperationalError: connection to server at "localhost" (127.0.0.1), port 5432 failed: FATAL:  database "myapp" does not exist
cat: database
description: The PostgreSQL server is running and you authenticated, but there is no database with that name on that server. Often psql is defaulting the database name to your username, or the app points at a different server than you think.
tldr: "Create it: `createdb myapp` or `sudo -u postgres createdb -O myuser myapp` (or `CREATE DATABASE myapp OWNER myuser;` in psql). If psql says the database named after your user doesn't exist, connect to an existing one: `psql -d postgres`. List databases with `psql -l`. Names are case-sensitive if created with quotes."
keywords: postgres postgresql fatal database does not exist psql createdb create database docker postgres_db django rails connection default database username
related: [db-postgres-role-does-not-exist, db-postgres-connection-refused, db-postgres-relation-does-not-exist]
---
## What it means

PostgreSQL connections always target one database. The server accepted the connection and the login, then couldn't find the database named in the connection string. Databases are per server (cluster), so the same name may exist on one host/port and not another.

List what exists on the server you're connecting to:

```bash
psql -h localhost -U myuser -d postgres -l
# or inside psql
\l
```

## Cause 1: the database was never created

Create it, owned by the role your app uses:

```bash
sudo -u postgres createdb -O myuser myapp
```

or in SQL:

```sql
CREATE DATABASE myapp OWNER myuser;
```

Frameworks generally don't create the database for you on first connect: Rails has `bin/rails db:create`, Django and most others expect it to exist.

## Cause 2: psql defaults to your username as the database

Running plain `psql` as user `alice` tries to connect to database `alice`:

```
psql: error: ... FATAL:  database "alice" does not exist
```

Connect to the default `postgres` database instead (it always exists on a fresh install):

```bash
psql -d postgres
```

Or create a database named after yourself so plain `psql` works: `createdb alice`. You can also set `PGDATABASE=postgres` in your environment.

## Cause 3: Docker's POSTGRES_DB only applies on first start

The official image creates `POSTGRES_DB` (default: the value of `POSTGRES_USER`) only when the data directory is empty. If the volume already existed, changing `POSTGRES_DB` later does nothing.

```bash
# create it in the running container
docker exec -it db psql -U postgres -c "CREATE DATABASE myapp;"

# or, if the data is disposable, recreate the volume
docker compose down -v
docker compose up -d
```

`down -v` deletes the database volume and all data in it.

## Cause 4: wrong server, port or container

You may have two PostgreSQL instances (a local install on 5432 and a Docker one, or two versions on 5432 and 5433). The database exists on one, your app connects to the other. Check:

```bash
sudo ss -ltnp | grep 543
psql "postgresql://myuser@localhost:5432/postgres" -c "select version(), inet_server_port();"
```

From inside a Docker Compose service, `localhost` is the container itself; use the service name (`host=db`).

## Cause 5: case and quoting

Unquoted identifiers are folded to lowercase. `CREATE DATABASE MyApp;` creates `myapp`. But a tool that created `"MyApp"` with quotes made a mixed-case name, and connecting to `myapp` fails. Use the exact name shown by `\l`, and prefer lowercase names.

## Cause 6: typo in the connection URL

Check the path part of the URL: in `postgresql://user:pass@host:5432/myapp?sslmode=require`, the database is `myapp`. A trailing space or a missing `/dbname` (which makes it default to the username) is a common mistake in `.env` files.
