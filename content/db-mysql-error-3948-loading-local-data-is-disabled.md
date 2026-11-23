---
error: "ERROR 3948 (42000): Loading local data is disabled; this must be enabled on both the client and server sides"
error_full: |
  ERROR 3948 (42000): Loading local data is disabled; this must be enabled on both the client and server sides
cat: database
description: "`LOAD DATA LOCAL INFILE` reads a file from the client machine, and MySQL 8.0 disables that by default on the server (`local_infile=OFF`). The client must allow it too."
tldr: "Enable it on the server: `SET GLOBAL local_infile = 1;` (or `local_infile=1` under `[mysqld]` in my.cnf), then connect the client with `mysql --local-infile=1 -u user -p db`. In code, set the driver option (`allowLoadLocalInfile=true` for Connector/J, `local_infile=True` for PyMySQL/mysql-connector). Or drop `LOCAL` and load from the server's `secure_file_priv` directory."
keywords: mysql error 3948 loading local data is disabled must be enabled on both the client and server sides load data local infile local_infile global mysql workbench OPT_LOCAL_INFILE allowLoadLocalInfile 2068 csv import
related: [db-mysql-error-1290-secure-file-priv, db-mysql-access-denied-for-user-root-localhost, db-mysql-error-1064-you-have-an-error-in-your-sql-syntax]
---
## What it means

`LOAD DATA LOCAL INFILE 'file.csv'` makes the *client* read the file and stream it to the server. Because a malicious server could ask a client for arbitrary files, both sides must opt in:

- server: system variable `local_infile` (default `OFF` since MySQL 8.0)
- client: the `--local-infile` option / driver flag (default off in most clients)

Error 3948 comes from the server side. If only the client side is missing, you get `ERROR 2068 (HY000): LOAD DATA LOCAL INFILE file request rejected due to restrictions on access`.

## Fix 1: enable local_infile on the server

Check it:

```sql
SHOW GLOBAL VARIABLES LIKE 'local_infile';
```

Turn it on (needs `SYSTEM_VARIABLES_ADMIN` or `SUPER`):

```sql
SET GLOBAL local_infile = 1;
```

That lasts until restart. To persist, either:

```sql
SET PERSIST local_infile = 1;
```

or add to `my.cnf` / `mysqld.cnf` and restart:

```ini
[mysqld]
local_infile=1
```

Managed databases: on AWS RDS/Aurora, Azure and Google Cloud SQL, change `local_infile` in the parameter group / flags instead (RDS enables it in the default group).

## Fix 2: enable it on the client

Command-line client:

```bash
mysql --local-infile=1 -u app -p mydb
```

```sql
LOAD DATA LOCAL INFILE '/home/me/users.csv'
INTO TABLE users
FIELDS TERMINATED BY ',' ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES;
```

Or permanently in `~/.my.cnf`:

```ini
[client]
local_infile=1
```

MySQL Workbench: edit the connection > **Advanced** > Others, add `OPT_LOCAL_INFILE=1`, reconnect.

## Fix 3: enable it in your driver

Java (Connector/J):

```
jdbc:mysql://localhost:3306/mydb?allowLoadLocalInfile=true
```

Python PyMySQL / mysqlclient:

```python
conn = pymysql.connect(host="localhost", user="app", password="...",
                       database="mydb", local_infile=True)
```

mysql-connector-python:

```python
conn = mysql.connector.connect(..., allow_local_infile=True)
```

Node `mysql2`: pass an `infileStreamFactory` function in the query options so the driver can open the local file.

PHP PDO: `PDO::MYSQL_ATTR_LOCAL_INFILE => true` in the constructor options.

## Alternative: load from the server without LOCAL

If the file can be placed on the database server, skip `LOCAL`. Then the server reads it directly, `local_infile` doesn't matter, but the file must be inside `secure_file_priv` and the user needs the `FILE` privilege:

```sql
SHOW VARIABLES LIKE 'secure_file_priv';
LOAD DATA INFILE '/var/lib/mysql-files/users.csv' INTO TABLE users ...;
```

See [secure-file-priv error 1290](/database/db-mysql-error-1290-secure-file-priv/).

## Docker

For the official image, pass the option on the command line:

```bash
docker run -d -e MYSQL_ROOT_PASSWORD=secret mysql:8 --local-infile=1
```

If your CSV came from Excel, convert and check it first (the [CSV to JSON tool](/tools/csv-to-json/) helps spot broken quoting), and watch for `\r\n` line endings: use `LINES TERMINATED BY '\r\n'`.
