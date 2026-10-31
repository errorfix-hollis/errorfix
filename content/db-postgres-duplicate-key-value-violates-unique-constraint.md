---
error: "ERROR: duplicate key value violates unique constraint"
error_full: |
  ERROR:  duplicate key value violates unique constraint "users_pkey"
  DETAIL:  Key (id)=(1) already exists.
  ERROR:  duplicate key value violates unique constraint "users_email_key"
  DETAIL:  Key (email)=(ada@example.com) already exists.
cat: database
description: PostgreSQL rejected an INSERT or UPDATE because a row with the same value already exists in a column with a PRIMARY KEY or UNIQUE constraint. On a _pkey constraint it's usually a sequence that fell behind after manual inserts or a data import.
tldr: "If it's `<table>_pkey` after an import, reset the sequence: `SELECT setval(pg_get_serial_sequence('users','id'), COALESCE(MAX(id),0)+1, false) FROM users;`. If it's real duplicate data, use `INSERT ... ON CONFLICT (email) DO NOTHING` or `DO UPDATE SET ...` for upserts, and don't insert explicit ids."
keywords: postgres postgresql duplicate key value violates unique constraint pkey already exists sequence setval pg_get_serial_sequence on conflict do nothing upsert 23505
related: [db-postgres-relation-does-not-exist, db-postgres-connection-refused, db-mysql-access-denied-for-user-root-localhost]
---
## What it means

The constraint name and `DETAIL` line tell you which column clashed and with what value. The SQLSTATE code is `23505` (`unique_violation`), which is what ORMs and drivers check for (`IntegrityError` in SQLAlchemy/Django, `P2002` in Prisma).

## Cause 1: the id sequence is out of sync (most common)

`serial`/`identity` columns get their next value from a sequence. If rows were inserted **with explicit ids** (a dump, a CSV import, seed scripts, copying data from another DB), the sequence doesn't move, and the next normal insert reuses an existing id: `Key (id)=(1) already exists`.

Check:

```sql
SELECT MAX(id) FROM users;
SELECT last_value FROM users_id_seq;     -- or the name from the query below
SELECT pg_get_serial_sequence('users', 'id');
```

Fix by moving the sequence past the highest id:

```sql
SELECT setval(pg_get_serial_sequence('users', 'id'),
              COALESCE(MAX(id), 0) + 1, false)
FROM users;
```

(`false` means the next `nextval` returns exactly that value.) Do this for every table you imported into. Then stop sending `id` in your INSERTs.

## Cause 2: genuinely duplicate data

For a unique business column like `email`, decide what should happen.

Ignore duplicates:

```sql
INSERT INTO users (email, name)
VALUES ('ada@example.com', 'Ada')
ON CONFLICT (email) DO NOTHING;
```

Upsert (update the existing row):

```sql
INSERT INTO users (email, name)
VALUES ('ada@example.com', 'Ada Lovelace')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;
```

`ON CONFLICT` needs a unique index or constraint on exactly those columns. Available since PostgreSQL 9.5.

## Cause 3: duplicates inside one statement

A multi-row INSERT or `INSERT ... SELECT` with the same key twice fails even if the table is empty. With `ON CONFLICT DO UPDATE` you'll instead get "command cannot affect row a second time". De-duplicate the source:

```sql
INSERT INTO users (email, name)
SELECT DISTINCT ON (email) email, name FROM staging_users ORDER BY email, updated_at DESC
ON CONFLICT (email) DO NOTHING;
```

## Cause 4: race conditions

"Check if it exists, then insert" in application code fails when two requests run at the same time. Don't pre-check; rely on the constraint and use `ON CONFLICT`, or catch the `23505` error and handle it (e.g. return HTTP 409).

## Cause 5: case or whitespace variants

`Ada@Example.com` and `ada@example.com` are different to a normal unique index. If they should be the same, normalise before inserting, or use a unique index on `lower(email)` (then `ON CONFLICT` must target that expression) or the `citext` type.

## Adding a unique constraint fails

When creating a constraint on existing data you get "could not create unique index ... Key (...) is duplicated". Find the duplicates first:

```sql
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
```
