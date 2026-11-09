---
error: "ERROR: could not serialize access due to concurrent update"
error_full: |
  ERROR:  could not serialize access due to concurrent update
  ERROR:  could not serialize access due to read/write dependencies among transactions
  DETAIL:  Reason code: Canceled on identification as a pivot, during commit attempt.
  HINT:  The transaction might succeed if retried.
cat: database
description: "PostgreSQL aborted a transaction running at REPEATABLE READ or SERIALIZABLE isolation because another transaction changed the same data concurrently. This is expected behaviour: the application must retry the transaction."
tldr: "Catch SQLSTATE `40001` (serialization_failure) and retry the whole transaction from BEGIN, with a few attempts and a small random back-off. Keep transactions short. If you don't need that isolation level, use the default READ COMMITTED or `SELECT ... FOR UPDATE` instead."
keywords: postgres could not serialize access due to concurrent update read/write dependencies among transactions 40001 serialization_failure repeatable read serializable retry transaction
related: [db-postgres-duplicate-key-value-violates-unique-constraint, db-mysql-error-1205-lock-wait-timeout-exceeded, db-sqlite-database-is-locked]
---
## What it means

Under `REPEATABLE READ` and `SERIALIZABLE`, each transaction sees a snapshot from when it started. If you try to `UPDATE`/`DELETE` (or `SELECT ... FOR UPDATE`) a row that another transaction modified and committed after your snapshot, PostgreSQL can't apply your change without breaking isolation, so it aborts with **SQLSTATE 40001**.

Two variants:

- **"due to concurrent update"** — a row-level write conflict (REPEATABLE READ or SERIALIZABLE).
- **"due to read/write dependencies among transactions"** — SERIALIZABLE only; PostgreSQL's SSI detected a dangerous pattern of reads and writes, even if you didn't touch the same rows.

The PostgreSQL docs are explicit: applications using these levels must be prepared to retry. The HINT says so too.

## Fix 1: retry the whole transaction

Retry from `BEGIN`, not just the failed statement — the transaction is already aborted. Python (psycopg 3):

```python
import random, time
import psycopg
from psycopg import errors

def run_tx(conn, fn, attempts=5):
    for i in range(attempts):
        try:
            with conn.transaction():
                return fn(conn)
        except errors.SerializationFailure:
            if i == attempts - 1:
                raise
            time.sleep(random.uniform(0.01, 0.1) * (2 ** i))
```

Node (`pg`): catch errors where `err.code === '40001'`, `ROLLBACK`, and re-run. Many ORMs have helpers (e.g. Spring `@Retryable`, Django: wrap in a loop around `transaction.atomic()`).

Also retry on `40P01` (deadlock_detected); the handling is the same.

## Fix 2: use READ COMMITTED with explicit locks

If you set a higher isolation level by habit, the default `READ COMMITTED` doesn't raise this error — a concurrent update makes your `UPDATE` re-check the latest row version instead. For read-modify-write logic, lock the row explicitly:

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = 42 FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 42;
COMMIT;
```

Or do it atomically in one statement:

```sql
UPDATE accounts SET balance = balance - 100 WHERE id = 42 AND balance >= 100;
```

Check what you are running:

```sql
SHOW transaction_isolation;
SHOW default_transaction_isolation;
```

## Fix 3: reduce conflicts

- Keep transactions short; don't wait on user input or HTTP calls while one is open.
- Under SERIALIZABLE, declare read-only transactions: `BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY;` (or `DEFERRABLE` for long reports).
- Add indexes used by your `WHERE` clauses — SSI tracks reads at a coarser granularity (page or relation) when it has to scan, causing more false-positive conflicts.
- Avoid hot rows such as a single counter row updated by every request; use sequences or per-shard counters.

## Fix 4: the error from a replica

On a hot standby you may instead see `canceling statement due to conflict with recovery`. That's a different problem (replay conflicts); look at `hot_standby_feedback` and `max_standby_streaming_delay`.
