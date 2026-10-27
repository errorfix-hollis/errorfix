---
error: "ERROR 1045 (28000): Access denied for user 'root'@'localhost'"
error_full: "ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES)"
cat: database
description: MySQL rejected the username/password/host combination. On Ubuntu, root uses socket authentication by default, so log in with sudo mysql and create a separate app user.
tldr: "On Ubuntu/Debian, run `sudo mysql` (no password). Then create a user for your app: `CREATE USER 'app'@'localhost' IDENTIFIED BY 'strong-password'; GRANT ALL ON mydb.* TO 'app'@'localhost';`."
keywords: mysql error 1045 access denied for user root localhost using password yes no mariadb auth_socket reset root password
related: [db-postgres-password-authentication-failed]
---
## What it means

MySQL accounts are **user + host** pairs (`'root'@'localhost'`, `'app'@'%'`). Either the account doesn't exist for that host, the password is wrong, or the account uses a different authentication method.

`(using password: NO)` means your client didn't send a password at all. Add `-p`.

## Ubuntu/Debian: root uses auth_socket

Fresh MySQL/MariaDB installs on Ubuntu authenticate `root` via the Linux user, not a password:

```bash
sudo mysql
```

Don't switch root to a password just so your app can use it. Create a dedicated user instead:

```sql
CREATE DATABASE mydb;
CREATE USER 'app'@'localhost' IDENTIFIED BY 'a-strong-password';
GRANT ALL PRIVILEGES ON mydb.* TO 'app'@'localhost';
FLUSH PRIVILEGES;
```

If you really need password login for root (e.g. a GUI tool):

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'a-strong-password';
```

(MariaDB: `ALTER USER root@localhost IDENTIFIED VIA mysql_native_password USING PASSWORD('a-strong-password');`)

## Wrong host part

`'app'@'localhost'` and `'app'@'%'` are different accounts. Connecting via `127.0.0.1` (TCP) or from another machine/container may match a different row. See which exist:

```sql
SELECT user, host, plugin FROM mysql.user;
```

From Docker containers, your connection comes from the container network, so the user needs host `%` or the container's subnet.

## Forgot the root password

```bash
sudo systemctl stop mysql
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
```

```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new-strong-password';
```

Then kill the temporary server and `sudo systemctl start mysql`. On recent versions you may need `sudo mkdir -p /var/run/mysqld && sudo chown mysql: /var/run/mysqld` first.

## Docker

The official image sets the root password from `MYSQL_ROOT_PASSWORD` **only on first start** with an empty data volume. Changing the variable later does nothing. Remove the volume (deletes data) or change the password with SQL.
