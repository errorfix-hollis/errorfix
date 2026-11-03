---
error: "FATAL: sorry, too many clients already"
error_full: |
  psql: error: connection to server at "localhost" (127.0.0.1), port 5432 failed: FATAL:  sorry, too many clients already
  FATAL: remaining connection slots are reserved for non-replication superuser connections
cat: database
description: PostgreSQL reached max_connections. Usually an app is leaking connections or opening too many (one pool per worker/process); the fix is a connection pool, not just a higher limit.
tldr: "See who holds connections: `SELECT usename, application_name, state, count(*) FROM pg_stat_activity GROUP BY 1,2,3 ORDER BY 4 DESC;`. Kill idle ones with `pg_terminate_backend`, close connections in your code / cap pool size, put PgBouncer in front, and set `idle_in_transaction_session_timeout`. Raise `max_connections` only modestly (needs restart)."
keywords: postgres postgresql fatal sorry too many clients already max_connections remaining connection slots are reserved pg_stat_activity pgbouncer connection pool leak idle in transaction django prisma sqlalchemy
related: [db-postgres-connection-refused, db-postgres-password-authentication-failed, db-sqlite-database-is-locked]
---
## What it means

Every PostgreSQL connection is a separate server process. When the number of connections reaches `max_connections` (default 100), new ones are refused. A few slots are kept for superusers (`superuser_reserved_connections`, default 3), which is why you may see "remaining connection slots are reserved..." first.

## Step 1: see who is connected

Connect as a superuser (the reserved slots let you in) and run:

```sql
SHOW max_connections;

SELECT usename, datname, application_name, client_addr, state, count(*)
FROM pg_stat_activity
WHERE backend_type = 'client backend'
GROUP BY 1,2,3,4,5
ORDER BY count(*) DESC;
```

Look for: hundreds of `idle` connections from one app (pool too large or leaked), or `idle in transaction` (code opened a transaction and never committed).

## Step 2: free slots now

```sql
-- terminate connections idle for more than 10 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND backend_type = 'client backend'
  AND state_change < now() - interval '10 minutes'
  AND pid <> pg_backend_pid();
```

Restarting the misbehaving application also releases its connections.

## Cause 1: pool size × number of processes

Each app process gets its own pool. 4 servers × 8 workers × a pool of 10 = 320 connections. Size pools so the total stays under `max_connections` minus some headroom:

- **SQLAlchemy:** `create_engine(url, pool_size=5, max_overflow=5, pool_pre_ping=True)`
- **Django:** connections are per thread/request; keep `CONN_MAX_AGE` modest and use a pooler for many workers (Django 5.1+ supports `"OPTIONS": {"pool": True}` with psycopg 3)
- **Prisma:** `?connection_limit=5` in the connection URL
- **node-postgres:** `new Pool({ max: 10 })`
- **Spring/HikariCP:** `spring.datasource.hikari.maximum-pool-size=10`

## Cause 2: leaked connections

Connections opened but never closed — especially in error paths:

```python
# Python: always use context managers
with psycopg.connect(dsn) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT 1")
```

```js
// node-postgres: release clients from a pool
const client = await pool.connect();
try { await client.query('SELECT 1'); }
finally { client.release(); }
```

In serverless functions (Lambda, Vercel), create the pool *outside* the handler so it's reused, and use a pooler (RDS Proxy, PgBouncer, Supabase/Neon pooled URLs).

## Cause 3: idle in transaction

Set server-side timeouts so stuck sessions get cleaned up:

```sql
ALTER SYSTEM SET idle_in_transaction_session_timeout = '5min';
ALTER SYSTEM SET idle_session_timeout = '30min';   -- PostgreSQL 14+
SELECT pg_reload_conf();
```

## Fix: put PgBouncer in front

PgBouncer in `transaction` pool mode lets thousands of client connections share a few dozen server connections. Minimal `pgbouncer.ini`:

```ini
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
default_pool_size = 20
max_client_conn = 1000
```

Point your app at port 6432. (Transaction mode doesn't support session-level features like `SET` without `LOCAL`, advisory locks held across transactions, or — before PgBouncer 1.21 — named prepared statements.)

## Raising max_connections

```sql
ALTER SYSTEM SET max_connections = 200;
```

```bash
sudo systemctl restart postgresql    # requires a restart, not just reload
```

Each connection costs memory (several MB plus `work_mem` per sort), so don't set this to thousands. On managed services (RDS, Cloud SQL, Azure) the limit is tied to instance size; change it via the parameter group.
