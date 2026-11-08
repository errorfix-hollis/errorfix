---
error: "ERROR 2013 (HY000): Lost connection to MySQL server during query"
error_full: |
  ERROR 2013 (HY000): Lost connection to MySQL server during query
  ERROR 2006 (HY000): MySQL server has gone away
  pymysql.err.OperationalError: (2013, 'Lost connection to MySQL server during query')
cat: database
description: "The client's connection to MySQL/MariaDB dropped while a query was running. Common causes: a timeout (client, server or proxy), a packet larger than max_allowed_packet, the server crashing or being OOM-killed, or an idle connection closed by wait_timeout."
tldr: "Check the server error log first (`sudo tail -100 /var/log/mysql/error.log`) for a crash/OOM. For big imports raise `max_allowed_packet` (e.g. `SET GLOBAL max_allowed_packet=1073741824;`) and `net_read_timeout`/`net_write_timeout`. For long queries raise the client read timeout. For pooled apps enable pre-ping/recycle connections below `wait_timeout`."
keywords: mysql error 2013 lost connection to mysql server during query 2006 mysql server has gone away max_allowed_packet wait_timeout net_read_timeout mariadb dump import timeout
related: [db-mysql-too-many-connections, db-mysql-cant-connect-to-local-mysql-server-through-socket, db-mysql-error-1205-lock-wait-timeout-exceeded]
---
## What it means

Error 2013 means the TCP connection broke **while a query was in progress**. Its sibling 2006 (`MySQL server has gone away`) means it was already broken when the client tried to send the next query. Both are symptoms; the cause is on the server, the network path, or a client timeout.

Variants: `Lost connection to MySQL server at 'reading initial communication packet'` happens at connect time and usually means a firewall, `bind-address`, or `skip-name-resolve` issue rather than the causes below.

## Step 1: did the server crash?

```bash
sudo tail -100 /var/log/mysql/error.log      # or journalctl -u mysql / mariadb
sudo dmesg -T | grep -i -E "oom|killed process"
mysql -e "SHOW GLOBAL STATUS LIKE 'Uptime';"
```

A small `Uptime` or "Killed process ... mysqld" means the server restarted. Fix the root cause: give it more RAM, lower `innodb_buffer_pool_size`, or fix the query that triggers the crash.

## Cause 1: packet bigger than max_allowed_packet

Large `INSERT` statements from dumps, big BLOBs, or long `IN (...)` lists exceed the limit (default 64 MB in MySQL 8, smaller on older versions/MariaDB), and the server drops the connection.

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
SET GLOBAL max_allowed_packet = 1073741824;   -- 1 GB, new connections only
```

Persist it in `my.cnf` under `[mysqld]`: `max_allowed_packet=1G`. The client has its own limit too:

```bash
mysql --max_allowed_packet=1G mydb < dump.sql
```

## Cause 2: query runs longer than a timeout

Several timeouts can cut a long query:

- **Client read timeout**: e.g. PyMySQL `read_timeout`, JDBC `socketTimeout`, MySQL Workbench "DBMS connection read timeout" (Preferences → SQL Editor, default 30 s — a very common source of 2013 in Workbench).
- **Server network timeouts** during big imports/exports:

```sql
SET GLOBAL net_read_timeout = 600;
SET GLOBAL net_write_timeout = 600;
```

- **Proxies/load balancers** (HAProxy, ProxySQL, cloud LB idle timeouts, Kubernetes port-forward) closing quiet connections.
- `max_execution_time` (MySQL) / `max_statement_time` (MariaDB) killing long `SELECT`s.

Better long-term fix: make the query faster (`EXPLAIN`, add indexes) or batch the work.

## Cause 3: idle connection closed by wait_timeout

The server closes connections idle longer than `wait_timeout` (default 28800 s = 8 h; often set much lower on hosting). An app pool then reuses a dead connection and gets 2006/2013.

**Fix:** recycle or test connections before use:

```python
# SQLAlchemy
engine = create_engine(url, pool_pre_ping=True, pool_recycle=1800)
```

```properties
# HikariCP: keep below wait_timeout
spring.datasource.hikari.max-lifetime=1500000
```

## Cause 4: dump/restore over a slow link

For `mysqldump` of big tables use `--quick` (streams rows) and `--single-transaction`; for restores, split huge files or restore on the server host instead of over the network.
