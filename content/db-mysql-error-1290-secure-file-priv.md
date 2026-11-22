---
error: "ERROR 1290 (HY000): The MySQL server is running with the --secure-file-priv option so it cannot execute this statement"
error_full: |
  ERROR 1290 (HY000): The MySQL server is running with the --secure-file-priv option so it cannot execute this statement
cat: database
description: "SELECT ... INTO OUTFILE or LOAD DATA INFILE tried to use a path outside the directory allowed by secure_file_priv. Use the allowed directory, use LOAD DATA LOCAL, or change the setting."
tldr: "Run `SHOW VARIABLES LIKE 'secure_file_priv';` and write/read files only inside that directory (e.g. `/var/lib/mysql-files/`). For importing client-side files use `LOAD DATA LOCAL INFILE` with `local_infile` enabled. To change it, set `secure-file-priv=` in my.cnf under `[mysqld]` and restart MySQL."
keywords: mysql error 1290 hy000 secure-file-priv secure_file_priv into outfile load data infile local_infile mysql-files my.cnf export csv import
related: [db-mysql-access-denied-for-user-root-localhost, db-mysql-error-1064-you-have-an-error-in-your-sql-syntax, db-mysql-error-1366-incorrect-string-value]
---
## What it means

`secure_file_priv` restricts which server-side directory MySQL may read from (`LOAD DATA INFILE`, `LOAD_FILE()`) and write to (`SELECT ... INTO OUTFILE`). Check it:

```sql
SHOW VARIABLES LIKE 'secure_file_priv';
```

| Value | Meaning |
|---|---|
| a path, e.g. `/var/lib/mysql-files/` | only files in that directory |
| empty string | any path the mysqld user can access |
| `NULL` | import/export disabled entirely |

Default on Linux packages is `/var/lib/mysql-files/`; on Windows `C:\ProgramData\MySQL\MySQL Server 8.0\Uploads\`.

## Fix 1: use the allowed directory

```sql
SELECT id, name, email
INTO OUTFILE '/var/lib/mysql-files/users.csv'
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
FROM users;
```

Then copy it out: `sudo cp /var/lib/mysql-files/users.csv ~/`. On Windows use forward slashes: `'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/users.csv'`.

`INTO OUTFILE` won't overwrite an existing file (error 1086); delete it first. The file is written on the **database server**, not your client machine.

## Fix 2: import a client-side file with LOAD DATA LOCAL

`LOCAL` makes the client read the file and send it, so `secure_file_priv` doesn't apply:

```bash
mysql --local-infile=1 -u root -p mydb
```

```sql
SET GLOBAL local_infile = 1;   -- server side, needs admin
LOAD DATA LOCAL INFILE '/home/me/users.csv'
INTO TABLE users
FIELDS TERMINATED BY ',' ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES;
```

Without both settings you get `ERROR 3948 (42000): Loading local data is disabled`. In MySQL Workbench add `OPT_LOCAL_INFILE=1` under *Connection → Advanced → Others*.

## Fix 3: export from the client instead

You often don't need `INTO OUTFILE` at all:

```bash
mysql -u root -p -B -e "SELECT * FROM users" mydb > users.tsv
```

`-B` gives tab-separated output. Convert CSV to JSON afterwards with the [CSV to JSON tool](/tools/csv-to-json/) if needed.

## Fix 4: change secure_file_priv

It's read-only at runtime; set it in the config and restart. In `/etc/mysql/mysql.conf.d/mysqld.cnf` (or `my.cnf` / `my.ini`):

```ini
[mysqld]
secure-file-priv = /srv/mysql-io
```

```bash
sudo mkdir -p /srv/mysql-io && sudo chown mysql:mysql /srv/mysql-io
sudo systemctl restart mysql
```

`secure-file-priv = ""` removes the restriction, which is less secure. On Ubuntu, AppArmor also limits mysqld paths; add the new directory to `/etc/apparmor.d/local/usr.sbin.mysqld` and reload AppArmor. In Docker, pass `--secure-file-priv=/path` as a command argument and mount that directory.

The user also needs the `FILE` privilege for server-side files: `GRANT FILE ON *.* TO 'app'@'localhost';`.
