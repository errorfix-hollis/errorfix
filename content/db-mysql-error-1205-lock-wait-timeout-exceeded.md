---
error: "ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction"
error_full: |
  ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction
cat: database
description: An InnoDB transaction waited longer than innodb_lock_wait_timeout (default 50s) for a row lock held by another transaction. Find the blocking transaction, which is often idle and never committed.
tldr: "Find the blocker: `SELECT * FROM sys.innodb_lock_waits\\G` (MySQL 5.7+/8) and kill it with `KILL <blocking_pid>;` if it's stuck. Then fix the root cause: commit transactions promptly, avoid long transactions holding locks, add indexes so UPDATE/DELETE lock fewer rows, and retry on error 1205 in application code."
keywords: mysql error 1205 lock wait timeout exceeded try restarting transaction innodb_lock_wait_timeout innodb_trx sys.innodb_lock_waits kill blocking transaction mariadb deadlock
related: [db-mysql-access-denied-for-user-root-localhost, db-postgres-sorry-too-many-clients-already, db-sqlite-database-is-locked]
---
## What it means

InnoDB locks rows that a transaction modifies (or reads with `SELECT ... FOR UPDATE`) until that transaction commits or rolls back. Another transaction that wants the same rows waits. After `innodb_lock_wait_timeout` seconds (50 by default) the waiting statement fails with error 1205.

Only the waiting **statement** is rolled back by default, not the whole transaction (unless `innodb_rollback_on_timeout=ON`). Your application must decide whether to retry or roll back.

This is not a deadlock: deadlocks (error 1213) are detected immediately. 1205 means someone simply held the lock too long.

## Step 1: find the blocking transaction

While the wait is happening, from another session:

```sql
-- MySQL 5.7+ / 8.0
SELECT waiting_pid, waiting_query, blocking_pid, blocking_query,
       wait_age, sql_kill_blocking_connection
FROM sys.innodb_lock_waits\G
```

Also list open transactions and how long they've been running:

```sql
SELECT trx_mysql_thread_id AS pid, trx_started, trx_state,
       TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS age_s, trx_query
FROM information_schema.innodb_trx
ORDER BY trx_started;
```

A blocker with `trx_query = NULL` and a large age is an **idle transaction**: a client ran `BEGIN` / an UPDATE, then never committed.

## Fix 1: kill a stuck blocker

```sql
KILL 12345;   -- blocking_pid from the query above
```

Its transaction is rolled back and the waiters continue. Then find which application owns that connection (`SELECT * FROM information_schema.processlist WHERE id = 12345;` shows host and user).

## Cause 2: transactions left open by the application

Common sources:

- autocommit disabled (Python DB-API drivers like PyMySQL/mysqlclient start a transaction implicitly; you must call `conn.commit()`),
- an exception path that skips `commit()`/`rollback()`,
- a transaction that wraps a slow HTTP call or user interaction.

Use context managers so every path ends the transaction:

```python
with conn:                    # commits on success, rolls back on exception
    with conn.cursor() as cur:
        cur.execute("UPDATE accounts SET balance = balance - 10 WHERE id = %s", (1,))
```

Keep transactions short: do slow work before `BEGIN`, not inside it.

## Cause 3: missing index makes UPDATE/DELETE lock too many rows

InnoDB locks the index records it scans. `UPDATE orders SET status='x' WHERE customer_email='a@b.c'` without an index on `customer_email` scans and locks a large range, colliding with everyone.

```sql
EXPLAIN UPDATE orders SET status='x' WHERE customer_email='a@b.c';
CREATE INDEX idx_orders_email ON orders(customer_email);
```

## Cause 4: big batch jobs

A single `DELETE FROM logs WHERE created < '2025-01-01'` touching millions of rows holds locks for minutes. Process in chunks:

```sql
DELETE FROM logs WHERE created < '2025-01-01' LIMIT 5000;
-- repeat until 0 rows affected, committing each time
```

## Fix: retry in the application

Lock timeouts can happen under normal load. Catch error 1205 (and 1213), roll back, and retry the whole transaction a few times with backoff.

## Changing the timeout

You can change the limit per session or globally:

```sql
SET SESSION innodb_lock_wait_timeout = 120;
SET GLOBAL innodb_lock_wait_timeout = 120;   -- new connections
```

Raising it only hides the problem; lowering it (e.g. 5–10s for web requests) makes failures fast and visible.
