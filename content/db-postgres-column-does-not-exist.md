---
error: "ERROR: column does not exist"
error_full: |
  ERROR:  column "username" does not exist
  LINE 1: SELECT username FROM users;
                 ^
  HINT:  Perhaps you meant to reference the column "users.userName".
cat: database
description: "PostgreSQL couldn't find a column with that exact name. Usually a case-sensitivity issue (columns created with double quotes and capital letters), a string written in double quotes instead of single quotes, or a typo/missing migration."
tldr: "If the column was created as \"userName\", you must quote it: `SELECT \"userName\" FROM users;`. Use single quotes for string values: `WHERE name = 'bob'`, not `\"bob\"`. List real column names with `\\d users` in psql. Long-term, rename to lowercase: `ALTER TABLE users RENAME COLUMN \"userName\" TO user_name;`."
keywords: postgres postgresql error column does not exist double quotes case sensitive single quotes string literal hint perhaps you meant to reference camelcase alias where clause
related: [db-postgres-relation-does-not-exist, db-postgres-current-transaction-is-aborted, db-postgres-duplicate-key-value-violates-unique-constraint]
---
## What it means

PostgreSQL folds unquoted identifiers to **lowercase**. `SELECT userName` is really `SELECT username`. Quoted identifiers keep their exact case. So if a table was created with a quoted mixed-case column (very common with ORMs like Prisma, Sequelize, TypeORM, EF Core), unquoted queries won't find it.

The `HINT` line, when present, usually gives the correct name.

## Cause 1: mixed-case column names

```sql
CREATE TABLE users ("userName" text);
SELECT userName FROM users;     -- ERROR: column "username" does not exist
```

## Fix 1: quote it, or rename to lowercase

```sql
SELECT "userName" FROM users;
```

Better long-term (if you control the schema and code):

```sql
ALTER TABLE users RENAME COLUMN "userName" TO user_name;
```

Check the real names:

```sql
\d users
-- or
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
```

## Cause 2: double quotes around a string value

In SQL, double quotes mean *identifier*, single quotes mean *string*:

```sql
SELECT * FROM users WHERE name = "bob";   -- ERROR: column "bob" does not exist
```

## Fix 2: use single quotes

```sql
SELECT * FROM users WHERE name = 'bob';
```

Escape a single quote inside a string by doubling it: `'O''Brien'`. In application code, use parameters (`WHERE name = $1`) instead of building strings.

## Cause 3: referencing a SELECT alias in WHERE

```sql
SELECT price * qty AS total FROM orders WHERE total > 100;
-- ERROR: column "total" does not exist
```

`WHERE` is evaluated before the select list, so aliases aren't visible there (they are in `ORDER BY`).

## Fix 3: repeat the expression or use a subquery

```sql
SELECT price * qty AS total FROM orders WHERE price * qty > 100;

SELECT * FROM (SELECT price * qty AS total FROM orders) t WHERE total > 100;
```

## Cause 4: the column really isn't there

- A migration wasn't applied to this database: run your migration tool (`npx prisma migrate deploy`, `rails db:migrate`, `alembic upgrade head`, `python manage.py migrate`).
- You're connected to a different database or schema than you think: `SELECT current_database(), current_schema();`.
- The column belongs to another table in a join - qualify it: `u.email` instead of `email`.

## Cause 5: wrong table in UPDATE ... FROM or in a trigger

`ERROR: column "x" does not exist` raised from a trigger function references `NEW.x` where the table has no `x`. Check the `CONTEXT:` line, which names the function, and fix the function body.

## Cause 6: quoted names with spaces or exact case from spreadsheets

Imported CSVs often create columns like `"First Name"` or `"Email "` (trailing space). Quote them exactly, or rename once:

```sql
ALTER TABLE contacts RENAME COLUMN "First Name" TO first_name;
```
