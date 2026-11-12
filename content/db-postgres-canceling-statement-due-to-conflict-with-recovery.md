---
error: "ERROR: canceling statement due to conflict with recovery"
error_full: |
  ERROR:  canceling statement due to conflict with recovery
  DETAIL:  User query might have needed to see row versions that must be removed.
  HINT:  In a moment you should be able to reconnect to the database and repeat your command.
cat: database
description: "A long query on a PostgreSQL hot standby (read replica) was cancelled because WAL replay from the primary needed to remove row versions or take locks the query was still using."
tldr: "On the replica, either let queries delay replay longer (`max_standby_streaming_delay = 5min` in postgresql.conf, then `SELECT pg_reload_conf();`) or tell the primary to keep the rows the replica needs (`hot_standby_feedback = on` on the replica). Also shorten long reports or run them on a dedicated replica. On AWS RDS/Aurora set these in the parameter group."
keywords: postgres postgresql error canceling statement due to conflict with recovery user query might have needed to see row versions that must be removed hot standby read replica max_standby_streaming_delay hot_standby_feedback vacuum rds aurora sqlstate 40001
related: [db-postgres-canceling-statement-due-to-statement-timeout, db-postgres-could-not-serialize-access, db-postgres-deadlock-detected]
---
## What it means

A **hot standby** replays the primary's WAL while also serving read queries. Sometimes replay needs to do something that conflicts with a running query, most often applying a `VACUUM` cleanup on the primary that removes old row versions your query's snapshot can still see. The standby then waits up to `max_standby_streaming_delay` (default **30s**) and, if the query is still running, cancels it with this error (SQLSTATE `40001`).

The `DETAIL` line tells you the kind of conflict:

| DETAIL | Cause |
|---|---|
| *User query might have needed to see row versions that must be removed* | VACUUM / HOT pruning on the primary (most common) |
| *User was holding a relation lock for too long* | `ACCESS EXCLUSIVE` lock on primary (ALTER TABLE, TRUNCATE, DROP, VACUUM truncation) |
| *User was holding shared buffer pin for too long* | buffer pin conflict |
| *User was or might have been using tablespace that must be dropped* / *connected to a database that must be dropped* | `DROP TABLESPACE` / `DROP DATABASE` on primary |
| *User transaction caused buffer deadlock with recovery* | rare buffer deadlock |

Check how often it happens per database on the standby:

```sql
SELECT datname, confl_snapshot, confl_lock, confl_bufferpin, confl_deadlock
FROM pg_stat_database_conflicts;
```

## Fix 1: allow longer replay delay on the standby

On the **standby**, in `postgresql.conf`:

```ini
max_standby_streaming_delay = 5min      # default 30s; -1 = wait forever
max_standby_archive_delay   = 5min      # same, when replaying from archive
```

```sql
SELECT pg_reload_conf();
```

Trade-off: while a query blocks replay, the replica falls behind (replication lag). Fine for a reporting replica, bad for one used for failover or read-your-writes traffic.

## Fix 2: `hot_standby_feedback`

On the **standby**:

```ini
hot_standby_feedback = on
```

The standby then tells the primary the oldest transaction it still needs, so VACUUM on the primary won't remove those rows. This removes most `confl_snapshot` cancellations.

Trade-off: long queries on the replica now cause **table bloat on the primary**, because dead rows can't be cleaned up until they finish. Combine with a query timeout on the replica, e.g.:

```sql
ALTER ROLE reporting SET statement_timeout = '15min';
```

It doesn't prevent lock conflicts (`confl_lock`) from DDL on the primary.

## Fix 3: managed databases (RDS, Aurora, Cloud SQL, Azure)

You can't edit `postgresql.conf`; change the parameters in the replica's **parameter group** / flags:

- AWS RDS PostgreSQL: `max_standby_streaming_delay`, `max_standby_archive_delay`, `hot_standby_feedback` (replica's parameter group).
- Aurora PostgreSQL: replicas share storage, so conflicts are different but still possible; tune `max_standby_streaming_delay` (capped at 30 seconds on Aurora) and keep queries shorter.
- Google Cloud SQL: set the database flags on the read replica.

## Fix 4: make the queries shorter or move them

- Add indexes / rewrite the report so it finishes well under the delay.
- Split huge exports into batches by key range.
- Run heavy analytics on a dedicated replica with a large `max_standby_streaming_delay`, and keep the failover replica strict.
- Avoid `ALTER TABLE`, `TRUNCATE` or `LOCK` on the primary during report windows (they cause `confl_lock`).

## Fix 5: retry in the application

The cancellation is safe to retry; the HINT says so. Treat SQLSTATE `40001` on replica reads as retryable, with backoff. Don't retry indefinitely for reports that always exceed the delay; fix those with Fix 1–4.
