---
error: "ERROR: relation does not exist"
error_full: |
  ERROR:  relation "users" does not exist
  LINE 1: SELECT * FROM users;
                        ^
  psycopg2.errors.UndefinedTable: relation "users" does not exist
cat: database
description: PostgreSQL can't find a table, view or sequence with that name in the schemas on your search_path, in the database you're connected to. Usually it's a case-sensitivity issue, the wrong schema or database, or migrations that never ran.
tldr: "List tables with `\\dt *.*` in psql and check you're in the right database (`SELECT current_database();`). If the table was created with quotes and capitals, query it with quotes: `SELECT * FROM \"Users\";`. If it's in another schema, qualify it (`myschema.users`) or `SET search_path TO myschema, public;`. Run your migrations if the table doesn't exist yet."
keywords: postgres postgresql error relation does not exist undefinedtable 42P01 case sensitive quoted identifier search_path schema public migrations psql dt
related: [db-postgres-role-does-not-exist, db-postgres-connection-refused, db-postgres-password-authentication-failed]
---
## What it means

"Relation" is Postgres's word for a table, view, materialized view, index or sequence. Error code `42P01` (`undefined_table`) means the name you used didn't resolve to any relation visible to the current session. Four things decide that: the exact name (with case), the schemas on `search_path`, the current database, and your permissions on the schema.

Start by looking at what exists:

```sql
SELECT current_database(), current_user;
SHOW search_path;
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name ILIKE 'users';
```

In psql, `\dt *.*` lists tables in all schemas.

## Cause 1: case sensitivity (quoted identifiers)

Postgres folds unquoted identifiers to lowercase. If the table was created with double quotes and capitals — as many ORMs and GUI tools do — it's stored with that exact case:

```sql
CREATE TABLE "Users" (id int);

SELECT * FROM Users;     -- ERROR: relation "users" does not exist
SELECT * FROM "Users";   -- works
```

Fix: always quote that name, or rename it once to lowercase and avoid quotes in future:

```sql
ALTER TABLE "Users" RENAME TO users;
```

## Cause 2: the table is in another schema

If the table lives in `app.users` but `search_path` is `"$user", public`, the unqualified name isn't found.

```sql
SELECT * FROM app.users;                 -- qualify it
SET search_path TO app, public;          -- this session only
ALTER ROLE myuser SET search_path TO app, public;   -- persistent for the role
```

In connection strings you can set it with `options=-csearch_path=app,public`.

## Cause 3: connected to the wrong database

Every database in a Postgres server is separate. Creating a table while connected to `postgres` and then querying from the app connected to `myapp` gives this error. Check the database name in your connection URL / env vars (`DATABASE_URL`, `PGDATABASE`) against where you created the table:

```bash
psql -d myapp -c '\dt'
```

In Docker setups, check you're not talking to a different container or a local Postgres on the same port.

## Cause 4: migrations didn't run

The table simply doesn't exist yet. Run your migrations against the same database the app uses:

```bash
python manage.py migrate          # Django
npx prisma migrate deploy         # Prisma
alembic upgrade head              # SQLAlchemy/Alembic
bundle exec rails db:migrate      # Rails
```

In test suites, make sure the test database is migrated too.

## Cause 5: created in an uncommitted transaction

If the `CREATE TABLE` ran inside a transaction that was rolled back, or not yet committed in another session, other connections won't see it. Make sure the creating script commits (psycopg2 doesn't autocommit by default — call `conn.commit()`).

## Cause 6: missing schema permission

If you lack `USAGE` on the schema, Postgres reports `permission denied for schema` in most cases, but it's worth checking privileges when the table is visible to one role and not another:

```sql
GRANT USAGE ON SCHEMA app TO myuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO myuser;
```

## Sequences

`relation "users_id_seq" does not exist` is the same error for a sequence — often from copying a schema dump without its sequences, or a renamed table whose sequence kept the old name. Check with `\ds`.
