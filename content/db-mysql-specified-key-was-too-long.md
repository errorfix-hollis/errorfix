---
error: "Specified key was too long; max key length is 767 bytes"
error_full: |
  ERROR 1071 (42000): Specified key was too long; max key length is 767 bytes
  SQLSTATE[42000]: Syntax error or access violation: 1071 Specified key was too long; max key length is 1000 bytes
cat: database
description: "An index on a VARCHAR/TEXT column is larger than the storage engine allows. With utf8mb4 each character can take 4 bytes, so `VARCHAR(255)` needs 1020 bytes, over the old 767-byte InnoDB limit."
tldr: "On MySQL 5.7.7+/8.0 and MariaDB 10.2.2+ use InnoDB with `ROW_FORMAT=DYNAMIC` (the default), which allows 3072-byte keys. On older servers either index a prefix (`INDEX (email(191))`), shorten the column to `VARCHAR(191)`, or in Laravel set `Schema::defaultStringLength(191);`. A 1000-byte limit means the table is MyISAM: convert with `ENGINE=InnoDB`."
keywords: mysql error 1071 specified key was too long max key length is 767 bytes 1000 bytes 3072 utf8mb4 varchar 191 laravel defaultStringLength innodb_large_prefix row_format dynamic mariadb
related: [db-mysql-error-1366-incorrect-string-value, db-mysql-error-1062-duplicate-entry, db-mysql-access-denied-for-user-root-localhost]
---
## What it means

Index keys have a maximum size in bytes, not characters:

| Engine / row format | Max key length |
|---|---|
| InnoDB `COMPACT` / `REDUNDANT` (old default) | 767 bytes |
| InnoDB `DYNAMIC` / `COMPRESSED` (default since MySQL 5.7.7, MariaDB 10.2.2) | 3072 bytes |
| MyISAM | 1000 bytes |

MySQL reserves the worst case per character: 4 bytes for `utf8mb4`, 3 for `utf8mb3`. So:

- `VARCHAR(255)` utf8mb4 = 1020 bytes → too long for 767 and 1000
- `VARCHAR(191)` utf8mb4 = 764 bytes → fits 767 (that's why "191" appears everywhere)
- `VARCHAR(768)` utf8mb4 = 3072 bytes → max for DYNAMIC

Composite indexes add up all their columns.

Check your server and table:

```sql
SELECT VERSION();
SHOW VARIABLES LIKE 'innodb_default_row_format';
SHOW TABLE STATUS WHERE Name = 'users';   -- Engine and Row_format columns
```

## Fix 1: use InnoDB with DYNAMIC row format (modern servers)

On MySQL 5.7+/8.0 or MariaDB 10.2+ the default is already DYNAMIC; you only get the 767 error if the table was created with `COMPACT` or the server is configured that way:

```sql
ALTER TABLE users ROW_FORMAT=DYNAMIC;
```

On MySQL 5.6 / MariaDB 10.1 you also need these in `my.cnf` (they were removed later):

```ini
[mysqld]
innodb_file_format = Barracuda
innodb_file_per_table = 1
innodb_large_prefix = 1
```

## Fix 2: the 1000-byte message means MyISAM

```sql
ALTER TABLE users ENGINE=InnoDB;
```

Set the default so new tables are InnoDB: `default-storage-engine=InnoDB`.

## Fix 3: shorten the column or index a prefix

If you can't change the server, limit the indexed length.

```sql
-- shorter column
ALTER TABLE users MODIFY email VARCHAR(191) NOT NULL;

-- or keep the column, index only the first 191 characters
CREATE INDEX idx_users_email ON users (email(191));
```

A prefix index can't enforce uniqueness on the full value: a `UNIQUE (email(191))` treats two values with the same first 191 characters as duplicates. For real emails that's fine; for long URLs or paths consider a hash column instead:

```sql
ALTER TABLE pages ADD url_hash BINARY(32) AS (UNHEX(SHA2(url, 256))) STORED,
                  ADD UNIQUE KEY uq_url_hash (url_hash);
```

## Fix 4: Laravel

The classic Laravel error on old MySQL/MariaDB. In `app/Providers/AppServiceProvider.php`:

```php
use Illuminate\Support\Facades\Schema;

public function boot(): void
{
    Schema::defaultStringLength(191);
}
```

Better: upgrade the database server, after which the default 255 works.

## Fix 5: Django, Rails and others

- **Django**: `CharField(max_length=255, unique=True)` on old MySQL; reduce `max_length` to 191 or upgrade. Ensure `OPTIONS: {'charset': 'utf8mb4'}` matches your intent.
- **Rails**: set `encoding: utf8mb4` and ensure `ROW_FORMAT=DYNAMIC` for the table, or `limit: 191` on indexed strings.

Don't "fix" it by switching to `utf8` (utf8mb3): it can't store emoji and leads to [error 1366](/database/db-mysql-error-1366-incorrect-string-value/).
