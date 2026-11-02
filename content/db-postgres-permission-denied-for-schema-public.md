---
error: "ERROR: permission denied for schema public"
error_full: |
  ERROR:  permission denied for schema public
  LINE 1: CREATE TABLE users (id serial primary key);
                       ^
  django.db.utils.ProgrammingError: permission denied for schema public
cat: database
description: The connecting role is not allowed to create objects (or use objects) in the public schema. Since PostgreSQL 15, ordinary users no longer get CREATE on public by default, so migrations fail on fresh databases.
tldr: "As a superuser, connected to the right database: `GRANT USAGE, CREATE ON SCHEMA public TO myuser;` — or make the role own the database and schema: `ALTER DATABASE mydb OWNER TO myuser; ALTER SCHEMA public OWNER TO myuser;`."
keywords: postgres postgresql permission denied for schema public postgres 15 grant create on schema public pg_database_owner django rails prisma migrations alter schema owner usage
related: [db-postgres-relation-does-not-exist, db-postgres-role-does-not-exist, db-postgres-password-authentication-failed]
---
## What it means

To create a table you need `CREATE` on the schema; to read objects in it you need `USAGE` on the schema (plus privileges on the tables themselves). The role you connect as lacks one of those on `public`.

The common trigger is **PostgreSQL 15+**. Older versions granted `CREATE` on `public` to every role (`PUBLIC`). From 15 onward, the `public` schema is owned by `pg_database_owner` and only the **database owner** can create objects there. So this classic setup now breaks migrations:

```sql
CREATE DATABASE mydb;
CREATE USER myuser WITH PASSWORD 'secret';
GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;   -- does NOT cover schemas
```

`GRANT ALL ON DATABASE` only gives `CONNECT`, `CREATE` (schemas) and `TEMPORARY` on the database itself — nothing inside the `public` schema.

## Fix 1: make the app role the database owner (recommended)

Connect as a superuser (e.g. `sudo -u postgres psql`):

```sql
ALTER DATABASE mydb OWNER TO myuser;
```

Because `public` is owned by `pg_database_owner` on PG 15+, the database owner automatically gets full rights on it. On older versions, also run:

```sql
\c mydb
ALTER SCHEMA public OWNER TO myuser;
```

For new databases, do it at creation time:

```sql
CREATE DATABASE mydb OWNER myuser;
```

## Fix 2: grant privileges on the schema

If the role shouldn't own the database, grant explicitly. **Connect to the target database first** — schema grants are per database, and running them while connected to `postgres` changes the wrong database.

```sql
\c mydb
GRANT USAGE, CREATE ON SCHEMA public TO myuser;
```

For a read-only or app role that only uses existing tables:

```sql
GRANT USAGE ON SCHEMA public TO app_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_reader;
ALTER DEFAULT PRIVILEGES FOR ROLE myuser IN SCHEMA public
  GRANT SELECT ON TABLES TO app_reader;
```

`ALTER DEFAULT PRIVILEGES` covers tables created later by `myuser`.

## Fix 3: use a dedicated schema

A clean pattern for shared databases:

```sql
CREATE SCHEMA app AUTHORIZATION myuser;
ALTER ROLE myuser SET search_path = app, public;
```

The role owns its schema and needs nothing on `public`.

## Check what's going on

```sql
SELECT current_user, current_database();
\dn+ public                      -- owner and access privileges
SELECT has_schema_privilege('myuser', 'public', 'CREATE');
```

In `\dn+`, an ACL entry like `myuser=UC/postgres` means USAGE (U) and CREATE (C).

## Docker and managed databases

- The official `postgres` image creates `POSTGRES_DB` owned by `POSTGRES_USER`, so it works out of the box — the error appears when you create an extra user later.
- On AWS RDS, Azure or Cloud SQL there's no true superuser; log in as the admin/master user, which can still run `ALTER DATABASE ... OWNER TO` (it must be a member of the target role: `GRANT myuser TO admin_user;` first).

## Related: `permission denied for table x`

That's a table-level privilege, not the schema. Grant it on the table, or change ownership:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO myuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO myuser;
```

Sequence privileges are needed for `serial` / identity inserts (`permission denied for sequence users_id_seq`).
