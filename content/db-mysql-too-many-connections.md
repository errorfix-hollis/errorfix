---
error: "ERROR 1040 (HY000): Too many connections"
error_full: |
  ERROR 1040 (HY000): Too many connections
  SQLSTATE[HY000] [1040] Too many connections
cat: database
description: MySQL reached max_connections (default 151). Either the limit is too low for your workload, or the application leaks connections or opens too many (no pooling, too many workers, sleeping connections).
tldr: "Check usage: `SHOW STATUS LIKE 'Threads_connected'; SHOW VARIABLES LIKE 'max_connections';` and `SHOW PROCESSLIST` for many `Sleep` connections. Short term: `SET GLOBAL max_connections = 500;` (and persist in my.cnf). Long term: use a connection pool with a sane size, close connections, and lower `wait_timeout` to reap idle ones."
keywords: mysql error 1040 too many connections max_connections threads_connected processlist sleep wait_timeout connection pool php pdo laravel mariadb max_used_connections
related: [db-postgres-sorry-too-many-clients-already, db-mysql-error-1205-lock-wait-timeout-exceeded, db-mysql-cant-connect-to-local-mysql-server-through-socket]
---
## What it means

Each client connection uses one slot. When `Threads_connected` reaches `max_connections`, new connections are refused with error 1040. MySQL keeps one extra slot for an account with `CONNECTION_ADMIN` / `SUPER` privilege, so an admin can usually still log in to investigate:

```bash
mysql -u root -p
```

MySQL 8.0.14+ can also expose a separate admin port (`admin_address`, `admin_port` = 33062) for exactly this situation.

## Step 1: look at what's connected

```sql
SHOW VARIABLES LIKE 'max_connections';
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';

SELECT user, host, db, command, COUNT(*) AS n
FROM information_schema.processlist
GROUP BY user, SUBSTRING_INDEX(host, ':', 1), db, command
ORDER BY n DESC;
```

- Hundreds of `Sleep` connections → the app opens connections and doesn't close or reuse them.
- Many active `Query` connections → slow queries pile up and each request holds a connection longer.

## Fix 1: raise max_connections (short term)

```sql
SET GLOBAL max_connections = 500;
```

That's lost on restart. Persist it:

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf  (or /etc/my.cnf)
[mysqld]
max_connections = 500
```

or in MySQL 8: `SET PERSIST max_connections = 500;`. Each connection costs memory (per-thread buffers), so don't set it to 10000 on a small server. On managed services (RDS, Cloud SQL) the default is derived from instance memory and changed via the parameter group / flags.

## Fix 2: close idle connections automatically

`wait_timeout` (default 28800s = 8 hours) is how long a sleeping non-interactive connection stays open. Lower it:

```sql
SET GLOBAL wait_timeout = 300;
```

and persist it in the config file. Make sure your pool validates connections, since it will see more closed-by-server connections.

To clear the current pile-up, kill sleeping connections from one user:

```sql
SELECT CONCAT('KILL ', id, ';') FROM information_schema.processlist
WHERE command = 'Sleep' AND user = 'app' AND time > 60;
```

## Fix 3: pool and size connections correctly

The total is *(app instances) × (workers per instance) × (pool size per worker)*. Ten containers × 8 gunicorn workers × pool of 10 = 800 connections. Size pools so the total stays below `max_connections`:

- **SQLAlchemy**: `create_engine(url, pool_size=5, max_overflow=5, pool_recycle=280, pool_pre_ping=True)`
- **HikariCP (Spring)**: `spring.datasource.hikari.maximum-pool-size=10`
- **Node mysql2**: `mysql.createPool({ connectionLimit: 10, ... })`
- **PHP**: each FPM worker opens its own connection; `pm.max_children` caps it. Avoid persistent connections (`PDO::ATTR_PERSISTENT`) unless sized carefully.

For many app servers, add a proxy such as ProxySQL or RDS Proxy.

## Fix 4: fix connection leaks

Make sure every code path closes or returns the connection:

```python
conn = pool.get_connection()
try:
    ...
finally:
    conn.close()      # returns it to the pool
```

In Node, call `connection.release()` after `pool.getConnection()`; or use `pool.query()` which does it for you. Serverless functions that create a new connection per invocation without reuse are a classic cause; create the pool outside the handler.

## Fix 5: slow queries holding connections

If most connections are in `Query` state, enable the slow query log and fix the worst queries and indexes. Faster queries return connections to the pool sooner.
