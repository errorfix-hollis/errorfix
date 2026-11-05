---
error: "ERROR 1062 (23000): Duplicate entry '1' for key 'PRIMARY'"
error_full: |
  ERROR 1062 (23000): Duplicate entry '1' for key 'PRIMARY'
  ERROR 1062 (23000): Duplicate entry 'alice@example.com' for key 'users.email'
cat: database
description: An INSERT or UPDATE would create a second row with the same value in a PRIMARY KEY or UNIQUE index. Decide whether to skip, update the existing row, or fix the data or auto-increment counter.
tldr: "Find the existing row: `SELECT * FROM t WHERE email='alice@example.com';`. To update instead of failing use `INSERT ... ON DUPLICATE KEY UPDATE col=VALUES(col)` (or `AS new` alias in 8.0.19+); to skip use `INSERT IGNORE`. Don't insert explicit ids into AUTO_INCREMENT columns; if the counter is behind, run `ALTER TABLE t AUTO_INCREMENT = <max(id)+1>;`."
keywords: mysql error 1062 23000 duplicate entry for key primary unique constraint insert ignore on duplicate key update auto_increment mariadb import dump integrityerror
related: [db-postgres-duplicate-key-value-violates-unique-constraint, db-mysql-error-1205-lock-wait-timeout-exceeded, db-mysql-access-denied-for-user-root-localhost]
---
## What it means

The value in quotes already exists in the index named after `for key`. `PRIMARY` is the primary key; anything else (`users.email`, `uniq_slug`) is a UNIQUE index. MySQL 8 prefixes the table name; older versions show just the index name.

See the index and the conflicting row:

```sql
SHOW INDEX FROM users WHERE Non_unique = 0;
SELECT * FROM users WHERE email = 'alice@example.com';
```

## Cause 1: the row really exists — you want an upsert

Update the existing row instead:

```sql
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

In MySQL 8.0.20+ `VALUES()` is deprecated in favour of a row alias:

```sql
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice') AS new
ON DUPLICATE KEY UPDATE name = new.name;
```

Or skip duplicates silently:

```sql
INSERT IGNORE INTO users (email, name) VALUES ('alice@example.com', 'Alice');
```

`INSERT IGNORE` also turns other errors (bad values, truncation) into warnings, so check `SHOW WARNINGS`. `REPLACE INTO` deletes and re-inserts the row, which fires delete triggers and cascades and gets a new auto-increment id — usually not what you want.

## Cause 2: inserting explicit ids into an AUTO_INCREMENT column

Seed scripts and copied rows often include `id`. Leave it out and let MySQL assign one:

```sql
INSERT INTO orders (customer_id, total) VALUES (42, 9.99);
```

## Cause 3: AUTO_INCREMENT counter is behind the data

After an import that inserted explicit ids, the counter can point at an id that's taken. Check and reset:

```sql
SELECT MAX(id) FROM orders;
SHOW TABLE STATUS LIKE 'orders';   -- Auto_increment column
ALTER TABLE orders AUTO_INCREMENT = 100001;   -- MAX(id) + 1
```

MySQL never sets the counter below `MAX(id)+1`, so a too-low value is ignored.

## Cause 4: `Duplicate entry '127' for key 'PRIMARY'` (or 255, 32767, 2147483647)

The id column type is full: `TINYINT` stops at 127, `SMALLINT` at 32767, `INT` at 2147483647 (signed). Every new insert tries the maximum again. Widen the column:

```sql
ALTER TABLE events MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;
```

## Cause 5: duplicates when adding a UNIQUE index

`ALTER TABLE users ADD UNIQUE (email)` fails if duplicates already exist. Find them first:

```sql
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
```

Note that with a case-insensitive collation (the default `utf8mb4_0900_ai_ci`), `Alice@Example.com` and `alice@example.com` are duplicates, and trailing spaces can be too.

## Cause 6: race conditions in application code

"Check if exists, then insert" from two requests at once lets both pass the check. Rely on the unique index and handle the error (or use the upsert above). In application code catch the driver's integrity error — e.g. `IntegrityError` with errno 1062 in Python, `SQLIntegrityConstraintViolationException` in Java.
