---
error: "ERROR 1046 (3D000): No database selected"
error_full: |
  ERROR 1046 (3D000): No database selected
  java.sql.SQLException: No database selected
  pymysql.err.OperationalError: (1046, 'No database selected')
cat: database
description: "MySQL received a query with an unqualified table name, but the connection has no default database. Select one with `USE`, put it in the connection settings, or qualify table names."
tldr: "Run `USE mydb;` before your statements, or connect with the database name: `mysql -u user -p mydb`. In apps, set the database in the connection (JDBC `jdbc:mysql://host:3306/mydb`, PyMySQL `database=\"mydb\"`). When importing a dump: `mysql -u user -p mydb < dump.sql`. Or write `mydb.table`."
keywords: mysql error 1046 3d000 no database selected use database mysqldump import phpmyadmin jdbc url pymysql mariadb create table
related: [db-mysql-error-1064-you-have-an-error-in-your-sql-syntax, db-mysql-access-denied-for-user-root-localhost, db-postgres-database-does-not-exist]
---
## What it means

A MySQL connection can have a *default database*. Statements like `SELECT * FROM users` or `CREATE TABLE users (...)` use it to find `users`. If no default is set, MySQL doesn't know which database you mean and returns error 1046.

Check from the client:

```sql
SELECT DATABASE();     -- NULL means no database selected
SHOW DATABASES;
```

## Fix 1: select a database with USE

```sql
USE shop;
SELECT * FROM users;
```

If it doesn't exist yet:

```sql
CREATE DATABASE shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE shop;
```

## Fix 2: pass the database when connecting

The `mysql` client takes the database as the last argument:

```bash
mysql -u app -p shop
mysql -h 127.0.0.1 -P 3306 -u app -p -D shop
```

## Fix 3: importing a .sql dump

Dumps made with `mysqldump shop` (single database) don't contain `CREATE DATABASE` / `USE`, so importing them without a target fails on the first `CREATE TABLE`:

```bash
mysql -u root -p shop < dump.sql
```

To produce a dump that includes the `USE` statement, export with `--databases`:

```bash
mysqldump -u root -p --databases shop > dump.sql
```

In **phpMyAdmin** or **MySQL Workbench**, click the target database in the left panel before using the Import / SQL tab (Workbench: double-click the schema so it's bold, or pick "Default Target Schema" in the import dialog).

## Fix 4: put the database in your application's connection settings

JDBC — the database is the path of the URL:

```text
jdbc:mysql://localhost:3306/shop?useSSL=false&serverTimezone=UTC
```

Spring Boot:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/shop
```

Python (PyMySQL / mysql-connector):

```python
conn = pymysql.connect(host="localhost", user="app", password=pw, database="shop")
```

Node (mysql2):

```js
const conn = await mysql.createConnection({ host: "localhost", user: "app", password, database: "shop" });
```

PHP PDO: `new PDO("mysql:host=localhost;dbname=shop;charset=utf8mb4", $user, $pass)`.

SQLAlchemy: `mysql+pymysql://app:pw@localhost/shop`.

A common mistake is an empty environment variable (`DB_NAME` not set), which produces a URL ending in `/`. Print the final connection string (without the password) to check.

## Fix 5: qualify table names

You can skip the default database by naming it in the query:

```sql
SELECT * FROM shop.users;
INSERT INTO shop.orders (user_id, total) VALUES (1, 9.99);
```

This is also useful for queries that join tables from two databases.
