---
error: "ERROR 1366 (HY000): Incorrect string value"
error_full: |
  ERROR 1366 (HY000): Incorrect string value: '\xF0\x9F\x98\x80' for column 'body' at row 1
cat: database
description: MySQL received bytes that can't be stored in the column's character set — almost always a 4-byte UTF-8 character like an emoji going into a utf8/utf8mb3 column. Switch the column, table and connection to utf8mb4.
tldr: "Convert the table: `ALTER TABLE posts CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;` (and the database default with `ALTER DATABASE ... CHARACTER SET utf8mb4`). Make the client connect with utf8mb4 too (`charset=utf8mb4` in the DSN, `SET NAMES utf8mb4`)."
keywords: mysql error 1366 hy000 incorrect string value \xF0\x9F emoji utf8mb4 utf8mb3 character set collation alter table convert to set names charset mariadb
related: [db-mysql-error-1062-duplicate-entry, db-mysql-access-denied-for-user-root-localhost, python-unicodedecodeerror-utf-8]
---
## What it means

MySQL's old `utf8` charset (now called `utf8mb3`) stores at most **3 bytes** per character. That covers most text but not characters outside the Basic Multilingual Plane: emoji, many CJK extension characters, musical and math symbols. Those need 4 bytes in UTF-8, and they start with `\xF0`–`\xF4`.

So a message like `Incorrect string value: '\xF0\x9F\x98\x80'` (that's 😀) means: a 4-byte character went into a column that's `utf8mb3`. In strict SQL mode (the default since 5.7) MySQL rejects the row; without strict mode it silently stores `?`.

If the bytes start with something else (e.g. `'\xE9t\xE9'`), the client is sending Latin-1 bytes while claiming UTF-8 — see Cause 3.

## Check what you have

```sql
SHOW CREATE TABLE posts\G
SELECT column_name, character_set_name, collation_name
FROM information_schema.COLUMNS
WHERE table_schema = 'mydb' AND table_name = 'posts';

SHOW VARIABLES LIKE 'character_set_%';
```

Any `utf8` / `utf8mb3` / `latin1` on the target column, or on `character_set_client`/`character_set_connection`, is a suspect.

## Fix 1: convert the table to utf8mb4

Back up first, then:

```sql
ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE posts CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

`CONVERT TO` changes every text column in the table and re-encodes existing data. To change a single column:

```sql
ALTER TABLE posts MODIFY body TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

On MySQL 8.0 `utf8mb4_0900_ai_ci` is the default and a good choice. `ALTER DATABASE` only changes the default for *new* tables, so you still need to convert the existing ones.

Large tables are rebuilt by this ALTER; on production use `pt-online-schema-change` or `gh-ost`.

### Index length gotcha

On old MySQL 5.6 / InnoDB with `COMPACT` row format, an index on `VARCHAR(255)` utf8mb4 (255 × 4 = 1020 bytes) exceeds the 767-byte limit: `Specified key was too long; max key length is 767 bytes`. Use `ROW_FORMAT=DYNAMIC` (default from 5.7), or shorten it to `VARCHAR(191)`.

## Fix 2: make the connection use utf8mb4

The column can be utf8mb4 and the insert still fails if the client connection is `utf8`. Set the charset in the client:

```sql
SET NAMES utf8mb4;
```

```python
# PyMySQL / mysqlclient
pymysql.connect(host=..., charset="utf8mb4")
# SQLAlchemy
create_engine("mysql+pymysql://user:pw@host/db?charset=utf8mb4")
```

```php
new PDO("mysql:host=localhost;dbname=mydb;charset=utf8mb4", $user, $pw);
```

```text
# JDBC (Connector/J 8 maps this to utf8mb4)
jdbc:mysql://host/db?characterEncoding=UTF-8
```

Django: `'OPTIONS': {'charset': 'utf8mb4'}`. Laravel: `'charset' => 'utf8mb4'` in `config/database.php` (the default).

And set server defaults in `my.cnf` so new tables are right:

```ini
[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

## Cause 3: the data isn't valid UTF-8

If the error bytes aren't a 4-byte sequence, your application is sending text in another encoding (often Latin-1/Windows-1252 from a CSV or legacy system). Decode the input properly before inserting, e.g. in Python `raw.decode("cp1252")`, or for `LOAD DATA` specify the file's encoding:

```sql
LOAD DATA INFILE '/tmp/data.csv' INTO TABLE posts CHARACTER SET latin1 ...;
```

## Don't strip the characters

Turning off strict mode or removing emoji from the input "fixes" the error by losing data. utf8mb4 is the correct charset for any user-facing text in MySQL.
