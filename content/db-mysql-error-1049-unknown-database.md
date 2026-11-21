---
error: "ERROR 1049 (42000): Unknown database"
error_full: |
  ERROR 1049 (42000): Unknown database 'myapp'
  java.sql.SQLSyntaxErrorException: Unknown database 'myapp'
  django.db.utils.OperationalError: (1049, "Unknown database 'myapp'")
cat: database
description: "MySQL/MariaDB is reachable and your login worked, but the database (schema) name you asked for does not exist on that server."
tldr: "List databases with `mysql -u root -p -e \"SHOW DATABASES;\"`. If yours is missing, create it: `CREATE DATABASE myapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`. Otherwise fix the name (case, typos, stray quotes) or point the app at the right server/port."
keywords: mysql error 1049 42000 unknown database mariadb create database show databases jdbc django laravel docker MYSQL_DATABASE
related: [db-mysql-error-1046-no-database-selected, db-mysql-access-denied-for-user-root-localhost, db-mysql-error-2003-cant-connect-to-mysql-server]
---
## What it means

The client connected and authenticated, then tried to `USE` the database named in the command or connection string. The server has no schema with that name, so it returns error 1049. Nothing is wrong with the network or the password.

Check what really exists on the server you are connected to:

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p -e "SHOW DATABASES;"
```

## Cause 1: the database was never created

A fresh install, a new container or a new environment has only the system schemas (`mysql`, `information_schema`, `performance_schema`, `sys`). Create yours:

```sql
CREATE DATABASE myapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON myapp.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
```

Then run your migrations (`php artisan migrate`, `python manage.py migrate`, Flyway/Liquibase, etc.). Most frameworks create tables but **not** the database itself.

## Cause 2: typo, case or quoting in the name

On Linux, database names are case-sensitive by default (`lower_case_table_names=0`), so `MyApp` and `myapp` are different. Also look for extra characters in `.env` files:

```ini
# wrong: quotes or trailing spaces become part of the name in some loaders
DB_DATABASE="myapp "
# right
DB_DATABASE=myapp
```

For JDBC, the database is the path part of the URL:

```
jdbc:mysql://localhost:3306/myapp?useSSL=false
```

## Cause 3: connected to a different server than you think

If you have a local MySQL *and* a Docker container, `localhost` may hit the local one (via the Unix socket) while your data is in the container. Force TCP and check the port:

```bash
mysql -h 127.0.0.1 -P 3307 -u root -p -e "SELECT @@hostname, @@port; SHOW DATABASES;"
```

## Cause 4: Docker `MYSQL_DATABASE` was ignored

The official `mysql`/`mariadb` images only create `MYSQL_DATABASE` on the **first** start with an empty data directory. If the volume already existed, changing the variable does nothing. Either create the database manually (Cause 1) or reset the volume (this deletes data):

```bash
docker compose down -v
docker compose up -d
```

## Cause 5: restoring a dump into a database that doesn't exist

`mysql -u root -p myapp < dump.sql` fails with 1049 if `myapp` is missing. Create it first, or produce dumps with `--databases myapp` so the file contains `CREATE DATABASE` and `USE` statements:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS myapp"
mysql -u root -p myapp < dump.sql
```
