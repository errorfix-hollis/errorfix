---
error: "FATAL: the database system is in recovery mode"
error_full: |
  psql: error: connection to server at "localhost" (127.0.0.1), port 5432 failed: FATAL:  the database system is in recovery mode
cat: database
description: "PostgreSQL is replaying its write-ahead log after a crash (often a backend killed by the OOM killer), and refuses connections until recovery finishes. Wait, then find out why it crashed."
tldr: "Usually just wait a few seconds to minutes and reconnect. Then check the server log for the crash cause (`terminated by signal 9: Killed` = OOM killer; `No space left on device` = full disk) and fix it: lower `work_mem`/`shared_buffers` or add RAM, free disk space. If it loops forever, look at the log for repeated crashes."
keywords: postgres postgresql fatal the database system is in recovery mode crash recovery oom killer terminated by signal 9 server process was terminated wal replay docker
related: [db-postgres-connection-refused, db-postgres-canceling-statement-due-to-conflict-with-recovery, linux-no-space-left-on-device]
---
## What it means

When any PostgreSQL backend process crashes, the postmaster kills **all** other connections and restarts in recovery mode, replaying the WAL from the last checkpoint so the data is consistent. While that happens, new connections get this error. It is a symptom: something crashed just before.

Typical log sequence:

```
LOG:  server process (PID 12345) was terminated by signal 9: Killed
DETAIL:  Failed process was running: SELECT ...
LOG:  terminating any other active server processes
LOG:  all server processes terminated; reinitializing
LOG:  database system was not properly shut down; automatic recovery in progress
LOG:  redo starts at 0/1A2B3C4D
LOG:  database system is ready to accept connections
```

If you are connecting to a **standby replica** that is still starting up, you may see this or `the database system is starting up` instead — the cause is the same: wait until it reaches a consistent state.

## Fix 1: wait and retry

Recovery usually takes seconds. Large WAL volumes (after a long time since the last checkpoint, or high `max_wal_size`) can take minutes. Watch the log:

```bash
sudo journalctl -u postgresql -f
# or
sudo tail -f /var/log/postgresql/postgresql-16-main.log
docker logs -f <postgres-container>
```

Apps should retry connections with a back-off instead of failing hard.

## Cause 1: the OOM killer (signal 9)

The most common reason. Confirm in the kernel log:

```bash
sudo dmesg -T | grep -iE 'killed process|out of memory'
```

Fixes:

- Lower `work_mem` — each sort/hash node in each connection can use this much, so `work_mem × connections × nodes` can exceed RAM.
- Keep `shared_buffers` around 25% of RAM, not more.
- Reduce `max_connections` and use a pooler like PgBouncer.
- In Docker/Kubernetes, raise the container memory limit.
- Avoid memory overcommit on dedicated DB servers: `vm.overcommit_memory = 2` (as recommended in the PostgreSQL docs).

## Cause 2: disk full

```bash
df -h /var/lib/postgresql
```

If WAL can't be written, PostgreSQL PANICs and restarts. Free space (old logs, dumps), but **never delete files from `pg_wal` by hand**. Check for an inactive replication slot holding WAL:

```sql
SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn))
FROM pg_replication_slots;
SELECT pg_drop_replication_slot('unused_slot');
```

## Cause 3: segfault in an extension or a bug

`terminated by signal 11: Segmentation fault` points at an extension (PostGIS, TimescaleDB, a custom C function) or a PostgreSQL bug. Update PostgreSQL to the latest minor release and the extension, and reproduce with the query shown in the `DETAIL:` line.

## Cause 4: stuck in a crash loop

If the server crashes again during or right after recovery, it never accepts connections. Read the log from the first error. Data-corruption messages (`invalid page`, `could not read block`) mean you should restore from backup; don't run `pg_resetwal` unless you understand it can lose data.
