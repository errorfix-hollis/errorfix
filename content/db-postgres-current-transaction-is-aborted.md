---
error: "ERROR: current transaction is aborted, commands ignored until end of transaction block"
error_full: |
  ERROR:  current transaction is aborted, commands ignored until end of transaction block
  psycopg2.errors.InFailedSqlTransaction: current transaction is aborted, commands ignored until end of transaction block
  org.postgresql.util.PSQLException: ERROR: current transaction is aborted, commands ignored until end of transaction block
cat: database
description: "An earlier statement in the same PostgreSQL transaction failed, so the transaction is now in an aborted state and every later statement is rejected until you ROLLBACK. This error is a symptom; the real error came before it."
tldr: "Find the first error in the transaction (check the earlier exception or the server log) and fix that. Then always `ROLLBACK` (e.g. `conn.rollback()` in psycopg2) after an exception before reusing the connection, or use `SAVEPOINT` / autocommit if you want later statements to continue."
keywords: postgres postgresql current transaction is aborted commands ignored until end of transaction block 25P02 infailedsqltransaction psycopg2 rollback savepoint jdbc django
related: [db-postgres-relation-does-not-exist, db-postgres-duplicate-key-value-violates-unique-constraint, db-postgres-deadlock-detected]
---
## What it means

PostgreSQL treats a transaction as all-or-nothing. When any statement inside `BEGIN ... COMMIT` fails, the whole transaction is marked as failed (SQLSTATE `25P02`). From then on the server ignores every command except `ROLLBACK` (or `ROLLBACK TO SAVEPOINT`) and answers each one with this error.

```sql
BEGIN;
INSERT INTO users (id, email) VALUES (1, 'a@x.com');  -- ERROR: duplicate key ...
SELECT * FROM users;                                    -- ERROR: current transaction is aborted
ROLLBACK;                                               -- now the session works again
```

So this message never tells you what went wrong. The cause is the **first** error in the transaction.

## Fix 1: find the original error

- In application logs, scroll up: the previous exception (`UniqueViolation`, `UndefinedTable`, `relation does not exist`, a type cast error...) is the real problem.
- If your code swallows exceptions, enable statement error logging on the server and check its log:

```sql
SHOW log_min_error_statement;   -- default 'error' already logs failing statements
```

```bash
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

## Fix 2: roll back after an exception (psycopg2 / psycopg)

psycopg2 opens a transaction implicitly on the first statement. If you catch an exception and keep using the connection, every later query fails:

```python
try:
    cur.execute("INSERT INTO users (email) VALUES (%s)", (email,))
except psycopg2.errors.UniqueViolation:
    conn.rollback()          # required before the next statement
else:
    conn.commit()
```

Using the connection as a context manager commits on success and rolls back on exception:

```python
with conn:                   # transaction block
    with conn.cursor() as cur:
        cur.execute(...)
```

## Fix 3: use a savepoint to continue after an expected failure

If you want one statement to fail without losing the rest of the transaction, wrap it in a savepoint:

```sql
BEGIN;
INSERT INTO log VALUES (...);
SAVEPOINT try_insert;
INSERT INTO users ... ;               -- may fail
ROLLBACK TO SAVEPOINT try_insert;    -- only if it failed
COMMIT;                              -- log row is kept
```

Often simpler: avoid the error entirely with `INSERT ... ON CONFLICT DO NOTHING` (or `DO UPDATE`).

In Django, wrap the risky part in a nested atomic block, which creates a savepoint:

```python
from django.db import IntegrityError, transaction

try:
    with transaction.atomic():
        Profile.objects.create(user=user)
except IntegrityError:
    pass   # outer transaction is still usable
```

## Fix 4: JDBC / Spring

With `autoCommit=false`, call `connection.rollback()` in the `catch` block. In Spring `@Transactional`, an exception caught inside the method still leaves the transaction aborted; let it propagate, or move the risky call into a method annotated `@Transactional(propagation = Propagation.REQUIRES_NEW)` so it runs in its own transaction.

## Fix 5: connection pools returning dirty connections

If the error appears on a random request that did nothing wrong, a previous user of a pooled connection left it in an aborted transaction. Make sure every code path commits or rolls back (use `try/finally` or context managers), and configure the pool to roll back on return (PgBouncer in transaction mode, HikariCP and SQLAlchemy do this by default).

## In psql

Run `ROLLBACK;` to recover. To make psql auto-savepoint each statement in interactive sessions:

```sql
\set ON_ERROR_ROLLBACK interactive
```
