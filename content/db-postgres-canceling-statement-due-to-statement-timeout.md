---
error: "ERROR: canceling statement due to statement timeout"
error_full: |
  ERROR:  canceling statement due to statement timeout
  SQL state: 57014
cat: database
description: "The query ran longer than the statement_timeout configured for the session, user, database or connection pool, so PostgreSQL cancelled it (SQLSTATE 57014)."
tldr: "Find where the timeout is set (`SHOW statement_timeout;`) and either make the query faster (check `EXPLAIN (ANALYZE, BUFFERS)`, add indexes, avoid lock waits) or raise the limit just for that work: `SET LOCAL statement_timeout = '5min';` inside the transaction."
keywords: postgres postgresql canceling statement due to statement timeout 57014 statement_timeout lock_timeout slow query explain analyze index set local pgbouncer
related: [db-postgres-deadlock-detected, db-postgres-could-not-serialize-access, db-postgres-sorry-too-many-clients-already]
---
## What it means

`statement_timeout` is a per-statement time limit (default `0` = off). When a statement exceeds it, Postgres cancels it and the surrounding transaction is aborted. Someone set it: in `postgresql.conf`, on the role/database, on the connection string, or in your framework/ORM.

Similar messages with different causes:

- `canceling statement due to lock timeout` — `lock_timeout` hit while *waiting for a lock*.
- `canceling statement due to user request` — something called `pg_cancel_backend()` or the client cancelled (e.g. Ctrl+C, driver query timeout).
- `canceling statement due to conflict with recovery` — on a hot standby replica.

## Find where the timeout comes from

```sql
SHOW statement_timeout;

SELECT name, setting, source, sourcefile
FROM pg_settings WHERE name = 'statement_timeout';

-- role/database level overrides
SELECT coalesce(r.rolname, 'ALL') AS role, coalesce(d.datname, 'ALL') AS db, s.setconfig
FROM pg_db_role_setting s
LEFT JOIN pg_roles r ON r.oid = s.setrole
LEFT JOIN pg_database d ON d.oid = s.setdatabase;
```

Managed services (RDS parameter groups, Supabase, Heroku) and poolers often set it too. Supabase, for example, sets short timeouts on the `anon` and `authenticated` roles.

## Cause 1 / Fix 1: the query is slow

Run it with timing data (on a copy or with the timeout raised):

```sql
SET statement_timeout = 0;
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

Look for `Seq Scan` on large tables with a selective filter and add the missing index:

```sql
CREATE INDEX CONCURRENTLY idx_orders_customer ON orders (customer_id);
ANALYZE orders;
```

Other common fixes: keyset pagination instead of huge `OFFSET`, avoiding functions on indexed columns in `WHERE` (`lower(email)` needs an expression index), and running `VACUUM ANALYZE` when statistics are stale.

## Cause 2 / Fix 2: waiting on locks

The statement may be fast but blocked by another transaction (time spent waiting counts toward `statement_timeout`). Check:

```sql
SELECT pid, pg_blocking_pids(pid) AS blocked_by, now() - query_start AS waiting, query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

Often the blocker is an `idle in transaction` session. Fix the app so it commits, and set `idle_in_transaction_session_timeout` to kill stragglers.

## Cause 3 / Fix 3: legitimate long work (migrations, reports, backfills)

Raise the limit only for that transaction instead of globally:

```sql
BEGIN;
SET LOCAL statement_timeout = '30min';
UPDATE big_table SET ...;
COMMIT;
```

Or for one role: `ALTER ROLE reporting SET statement_timeout = '10min';` (applies to new sessions). For bulk updates, batch them (`WHERE id BETWEEN ...`) so each statement stays short.

Note: with PgBouncer in transaction mode, a plain `SET` may leak to other clients or be lost; use `SET LOCAL` inside a transaction, or set it on the role.

## Cause 4 / Fix 4: client-side timeouts

Some drivers send a cancel themselves, which shows up as `canceling statement due to user request`, e.g. JDBC `setQueryTimeout`, Django `OPTIONS: {"options": "-c statement_timeout=5000"}`, or Node `pg`'s `statement_timeout` / `query_timeout` config. Check your connection settings before changing the server.

After any of these errors inside a transaction, you must `ROLLBACK` before the connection can be used again (otherwise: `current transaction is aborted`).
