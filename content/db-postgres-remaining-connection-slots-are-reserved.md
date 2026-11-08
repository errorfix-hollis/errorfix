---
error: "FATAL: remaining connection slots are reserved for non-replication superuser connections"
error_full: |
  FATAL:  remaining connection slots are reserved for non-replication superuser connections
  FATAL:  remaining connection slots are reserved for roles with the SUPERUSER attribute
  FATAL:  remaining connection slots are reserved for roles with privileges of the "pg_use_reserved_connections" role
cat: database
description: "PostgreSQL is at max_connections minus superuser_reserved_connections, so only superusers can still log in. Something is opening too many connections, usually app instances without pooling or leaked/idle connections."
tldr: "Connect as a superuser and see who holds connections: `SELECT usename, application_name, state, count(*) FROM pg_stat_activity GROUP BY 1,2,3 ORDER BY 4 DESC;`. Kill idle ones with `pg_terminate_backend`, set `idle_in_transaction_session_timeout`, lower app pool sizes, and put PgBouncer in front instead of just raising max_connections."
keywords: postgres fatal remaining connection slots are reserved for non-replication superuser connections max_connections superuser_reserved_connections pgbouncer connection pool pg_stat_activity
related: [db-postgres-sorry-too-many-clients-already, db-postgres-connection-refused, db-mysql-too-many-connections]
---
## What it means

PostgreSQL keeps `superuser_reserved_connections` (default 3) of its `max_connections` (default 100) for superusers so an admin can always get in. Once ordinary roles have used the rest, new non-superuser logins get this error. PostgreSQL 16+ also has `reserved_connections` for members of `pg_use_reserved_connections`, which is why the wording varies by version.

When even the reserved slots are gone you get the related [sorry, too many clients already](/database/db-postgres-sorry-too-many-clients-already/).

On managed services (RDS, Cloud SQL, Azure, Supabase, Heroku) `max_connections` is set from the instance size, and the provider itself reserves some slots, so small plans hit this quickly.

## Step 1: see who is using the connections

Connect as a superuser (`psql -U postgres`), then:

```sql
SHOW max_connections;
SELECT count(*) FROM pg_stat_activity;

SELECT usename, application_name, client_addr, state, count(*)
FROM pg_stat_activity
GROUP BY 1, 2, 3, 4
ORDER BY 5 DESC;
```

Many rows with `state = 'idle'` mean connections are opened and kept but not used. `idle in transaction` means code began a transaction and never committed.

## Fix 1: terminate idle or stuck connections (immediate relief)

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state IN ('idle', 'idle in transaction')
  AND state_change < now() - interval '10 minutes'
  AND pid <> pg_backend_pid();
```

Prevent stuck transactions automatically:

```sql
ALTER SYSTEM SET idle_in_transaction_session_timeout = '5min';
ALTER SYSTEM SET idle_session_timeout = '30min';   -- PostgreSQL 14+
SELECT pg_reload_conf();
```

(`idle_session_timeout` will also close pooled connections your app expects to reuse; set it longer than the pool's idle timeout.)

## Fix 2: size application pools correctly

Total connections = instances × workers × pool size. Ten pods × 4 workers × pool of 10 is already 400. Reduce the per-process pool:

- SQLAlchemy: `create_engine(url, pool_size=5, max_overflow=5)`
- Node `pg`: `new Pool({ max: 5 })`
- Spring/HikariCP: `spring.datasource.hikari.maximum-pool-size=5`
- Django: keep `CONN_MAX_AGE` modest; each thread holds its own connection.

Also make sure code returns connections (closes clients, uses context managers) rather than creating a new pool per request. Serverless functions are a classic source of connection storms.

## Fix 3: put a connection pooler in front

PgBouncer in `transaction` mode lets thousands of client connections share a few dozen server connections:

```ini
; pgbouncer.ini
[databases]
app = host=127.0.0.1 port=5432 dbname=app

[pgbouncer]
listen_port = 6432
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

Point the app at port 6432. Managed equivalents: RDS Proxy, Supabase's pooler, Azure's built-in PgBouncer.

## Fix 4: raise max_connections (last)

Each connection is a process using several MB of RAM, so raising it blindly hurts performance.

```sql
ALTER SYSTEM SET max_connections = 200;
```

This requires a **restart** (`sudo systemctl restart postgresql`), not just a reload. On managed services change the parameter group / flags instead.
