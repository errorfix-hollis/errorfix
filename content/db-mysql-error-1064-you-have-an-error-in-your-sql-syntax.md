---
error: "ERROR 1064 (42000): You have an error in your SQL syntax"
error_full: |
  ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'order (id INT, total DECIMAL(10,2))' at line 1
cat: database
description: "MySQL's parser could not understand the statement. The text after 'near' is where parsing failed, usually a reserved word, a typo, bad quoting, or syntax from another database or MySQL version."
tldr: "Look at the first word in the `near '...'` snippet: the error is right there or just before it. Backtick-quote reserved words used as names (`` `order` ``, `` `group` ``), use single quotes for strings, fix missing commas, and don't use syntax your server version doesn't support."
keywords: mysql error 1064 42000 you have an error in your sql syntax check the manual near at line 1 reserved word backticks mariadb syntax error
related: [db-mysql-error-1062-duplicate-entry, db-mysql-error-1366-incorrect-string-value, db-mysql-access-denied-for-user-root-localhost]
---
## What it means

MySQL tokenizes your statement and stops at the first token that doesn't fit the grammar. The quoted text after `near` starts **at that token**. The mistake is usually that token itself or what comes just before it.

If the snippet is empty (`near '' at line 1`), the statement ended unexpectedly: a missing closing parenthesis, quote or value.

## Cause 1: a reserved word used as a name

```sql
CREATE TABLE order (id INT);           -- 1064 near 'order (id INT)'
SELECT key, value FROM settings;        -- 1064 near 'key, value'
```

`ORDER`, `GROUP`, `KEY`, `RANK`, `ROWS`, `SYSTEM`, `LEAD`, `INTERVAL`, `DESC`... are reserved. MySQL 8.0 added several (`RANK`, `ROWS`, `GROUPS`, `LEAD`, `LAG`, `SYSTEM`), so queries that worked on 5.7 can break after an upgrade. Quote identifiers with backticks:

```sql
CREATE TABLE `order` (id INT);
SELECT `key`, `value` FROM settings;
```

Or rename the column. Most ORMs have an option to always quote identifiers.

## Cause 2: wrong quotes

- Strings use single quotes: `WHERE name = 'Bob'`.
- Identifiers use backticks: `` `first name` ``.
- Double quotes are strings in MySQL by default, unless `ANSI_QUOTES` is enabled.
- Typographic quotes (`’ “`) pasted from docs or chat are not quotes at all.

An unescaped apostrophe also breaks the statement: `'O'Brien'`. Use parameterized queries instead of building SQL by string concatenation — that fixes quoting and prevents SQL injection:

```python
cur.execute("INSERT INTO users (name) VALUES (%s)", (name,))
```

## Cause 3: typos and missing punctuation

- Missing comma between columns: `SELECT id name FROM users` is valid (alias), but `CREATE TABLE t (id INT name VARCHAR(20))` is not.
- Trailing comma before `)` or before `FROM`.
- Clauses in the wrong order: must be `SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... LIMIT`.
- `UPDATE t SET a=1 AND b=2` is valid but wrong; use `SET a=1, b=2`.

## Cause 4: syntax from another database

| Not MySQL | MySQL |
|---|---|
| `SELECT TOP 10 *` (SQL Server) | `SELECT * ... LIMIT 10` |
| `"column"` identifiers (Postgres) | `` `column` `` |
| `RETURNING id` (Postgres) | not supported in MySQL (MariaDB 10.5+ supports it for INSERT/DELETE) |
| `id INT GENERATED ALWAYS AS IDENTITY` | `id INT AUTO_INCREMENT PRIMARY KEY` |
| `ALTER COLUMN x TYPE int` | `MODIFY COLUMN x INT` |

## Cause 5: features your server version doesn't have

`WITH` (CTEs) and window functions need MySQL 8.0+. Check with `SELECT VERSION();`. Old syntax such as `TYPE=InnoDB` was removed; use `ENGINE=InnoDB`. Also, `IDENTIFIED BY` inside `GRANT` was removed in 8.0 — create the user first:

```sql
CREATE USER 'app'@'%' IDENTIFIED BY 'secret';
GRANT ALL ON appdb.* TO 'app'@'%';
```

## Cause 6: delimiters in stored procedures

In the `mysql` client, the `;` inside a procedure body ends the statement early. Change the delimiter:

```sql
DELIMITER //
CREATE PROCEDURE p() BEGIN SELECT 1; END //
DELIMITER ;
```

## Cause 7: importing a dump

When importing a dump from a newer server (or MariaDB ↔ MySQL), unsupported options cause 1064. Check the reported line number with `sed -n '123p' dump.sql`.
