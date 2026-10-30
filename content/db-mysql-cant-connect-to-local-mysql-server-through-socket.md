---
error: "ERROR 2002 (HY000): Can't connect to local MySQL server through socket '/var/run/mysqld/mysqld.sock' (2)"
error_full: |
  ERROR 2002 (HY000): Can't connect to local MySQL server through socket '/var/run/mysqld/mysqld.sock' (2)
  ERROR 2002 (HY000): Can't connect to local MySQL server through socket '/tmp/mysql.sock' (2)
cat: database
description: The MySQL client tried to connect via a Unix socket file that doesn't exist. Either the MySQL/MariaDB server isn't running, or the client and server disagree on the socket path. Error (2) is ENOENT, (13) is permission denied.
tldr: "Start the server: `sudo systemctl start mysql` (or `mariadb`; macOS `brew services start mysql`) and check `sudo systemctl status mysql` / the error log if it won't start. If it is running, find the real socket with `sudo ss -xlp | grep mysql` and pass it with `--socket`, or connect over TCP: `mysql -h 127.0.0.1 -P 3306 -u root -p`."
keywords: mysql error 2002 hy000 can't connect to local mysql server through socket var run mysqld mysqld.sock tmp mysql.sock mariadb not running systemctl start mysql docker localhost 127.0.0.1
related: [db-mysql-access-denied-for-user-root-localhost, db-postgres-connection-refused, linux-no-space-left-on-device]
---
## What it means

When you connect to host `localhost`, the MySQL client doesn't use TCP — it uses a Unix socket file (default `/var/run/mysqld/mysqld.sock` on Debian/Ubuntu, `/var/lib/mysql/mysql.sock` on RHEL, `/tmp/mysql.sock` on macOS Homebrew). The number in parentheses is the OS error:

- `(2)` — the socket file doesn't exist: server not running, or a different path.
- `(13)` — permission denied on the socket or its directory.
- `(111)` — connection refused: the file exists but nothing is listening (stale socket).

## Cause 1: the server isn't running

The most common case. Check and start it:

```bash
sudo systemctl status mysql        # or: mariadb, mysqld
sudo systemctl start mysql
sudo systemctl enable mysql        # start on boot
```

macOS (Homebrew):

```bash
brew services list
brew services start mysql
```

WSL without systemd: `sudo service mysql start`.

If it isn't installed at all, `systemctl status` says `Unit mysql.service could not be found` — install `mysql-server` or `mariadb-server`.

## Cause 2: the server fails to start

If `start` fails or the service stops right away, read the log:

```bash
sudo journalctl -u mysql -n 50 --no-pager
sudo tail -n 50 /var/log/mysql/error.log
```

Frequent reasons:

- **Disk full** — check `df -h`; MySQL can't write its files.
- **Port 3306 already in use** by another MySQL/MariaDB instance or container: `sudo ss -tlnp | grep 3306`.
- **Bad config** after an edit in `/etc/mysql/` — the log names the unknown option.
- **Permissions** on the data dir after copying/restoring: `sudo chown -R mysql:mysql /var/lib/mysql`.
- **Missing socket directory** `/var/run/mysqld` (it's on tmpfs): `sudo mkdir -p /var/run/mysqld && sudo chown mysql:mysql /var/run/mysqld`.

## Cause 3: client and server use different socket paths

If the server is running, find where its socket actually is:

```bash
sudo ss -xlp | grep -i mysql
mysqladmin -u root -p variables | grep socket   # if you can connect another way
```

Then point the client at it:

```bash
mysql -u root -p --socket=/var/lib/mysql/mysql.sock
```

To make it permanent, set the same path for client and server in `my.cnf`:

```ini
[mysqld]
socket=/var/run/mysqld/mysqld.sock

[client]
socket=/var/run/mysqld/mysqld.sock
```

For PHP, set `pdo_mysql.default_socket` / `mysqli.default_socket` in php.ini to the same path.

## Cause 4: MySQL is in Docker, client on the host

A container's socket isn't visible on the host. `localhost` makes the client look for a local socket file and fail. Force TCP to the published port:

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p
mysql --protocol=TCP -u root -p
```

From another container in the same compose network, use the service name as host (e.g. `-h db`).

## Cause 5: permission denied (13)

The user running the client (e.g. a web server) can't access the socket directory. Check:

```bash
ls -ld /var/run/mysqld /var/run/mysqld/mysqld.sock
```

The directory should be traversable (`drwxr-xr-x mysql mysql`). On SELinux systems, a non-standard socket path also needs the right context.
