---
error: "ERROR: deadlock detected"
error_full: |
  ERROR:  deadlock detected
  DETAIL:  Process 12345 waits for ShareLock on transaction 67890; blocked by process 12346.
  Process 12346 waits for ShareLock on transaction 67889; blocked by process 12345.
  HINT:  See server log for query details.
  CONTEXT:  while updating tuple (0,5) in relation "accounts"
cat: database
description: "Two (or more) PostgreSQL transactions each hold a lock the other needs, so neither can proceed. Postgres aborts one of them with SQLSTATE 40P01."
tldr: "Make every transaction lock rows in the same order (e.g. `ORDER BY id` with `SELECT ... FOR UPDATE`), keep transactions short, and retry the aborted transaction on SQLSTATE `40P01`. Check the server log for both queries involved."
keywords: postgres postgresql error deadlock detected 40P01 sharelock waits for transaction blocked by process select for update lock order retry
related: [db-postgres-could-not-serialize-access, db-mysql-error-1205-lock-wait-timeout-exceeded, db-postgres-duplicate-key-value-violates-unique-constraint]
---
## What it means

Transaction A locked row 1 and wants row 2; transaction B locked row 2 and wants row 1. Neither can finish. After `deadlock_timeout` (default 1s) Postgres checks for such cycles, picks a victim, and aborts it with `deadlock detected` (SQLSTATE `40P01`). The other transaction continues normally.

The victim's whole transaction is rolled back. Nothing is corrupted, but your application must handle the error.

## Find the queries involved

The client message hides the statements. The server log has them:

```
DETAIL: Process 12345: UPDATE accounts SET balance = balance - 10 WHERE id = 1
        Process 12346: UPDATE accounts SET balance = balance - 5 WHERE id = 2
```

Turn on `log_lock_waits = on` to also log waits longer than `deadlock_timeout`. Live blocking can be seen with:

```sql
SELECT pid, pg_blocking_pids(pid) AS blocked_by, state, query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

## Cause 1 / Fix 1: rows locked in different orders

The classic case: a transfer that updates the two accounts in parameter order.

```sql
-- tx A: transfer 1 -> 2        -- tx B: transfer 2 -> 1
UPDATE accounts ... WHERE id=1;  UPDATE accounts ... WHERE id=2;
UPDATE accounts ... WHERE id=2;  UPDATE accounts ... WHERE id=1;  -- deadlock
```

Lock in a consistent order up front:

```sql
BEGIN;
SELECT id FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
UPDATE accounts SET balance = balance - 10 WHERE id = 1;
UPDATE accounts SET balance = balance + 10 WHERE id = 2;
COMMIT;
```

The same applies to batch updates: `UPDATE ... WHERE id IN (...)` doesn't guarantee order, so lock with `SELECT ... ORDER BY id FOR UPDATE` first, or sort the batch in the application.

## Cause 2 / Fix 2: foreign keys and parent rows

Inserting child rows takes a `FOR KEY SHARE` lock on the referenced parent row. Two transactions that insert children and then update the same parents can deadlock. Update the parent first, or avoid updating parent rows in the same transaction that inserts children.

## Cause 3 / Fix 3: long transactions

The longer a transaction holds locks, the more likely a cycle. Don't do network calls or user interaction inside a transaction, and commit as early as possible.

## Cause 4 / Fix 4: explicit table locks and DDL

`LOCK TABLE`, `ALTER TABLE` or `CREATE INDEX` (without `CONCURRENTLY`) running alongside normal traffic can deadlock with it. Run migrations during low traffic, use `CREATE INDEX CONCURRENTLY`, and set `lock_timeout` for DDL:

```sql
SET lock_timeout = '5s';
```

## Always: retry on 40P01

Deadlocks can't be ruled out completely under concurrency, so retry the whole transaction:

```python
from psycopg import errors

for attempt in range(3):
    try:
        with conn.transaction():
            transfer(conn, a, b, amount)
        break
    except errors.DeadlockDetected:
        if attempt == 2:
            raise
```

Retry the entire transaction, not just the failed statement — everything before it was rolled back.
