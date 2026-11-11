---
error: "ERROR 1130 (HY000): Host is not allowed to connect to this MySQL server"
error_full: |
  ERROR 1130 (HY000): Host '192.168.1.50' is not allowed to connect to this MySQL server
  java.sql.SQLException: null, message from server: "Host '172.17.0.1' is not allowed to connect to this MySQL server"
cat: database
description: "MySQL accepted the TCP connection but found no user account whose host part matches your client's address. Accounts are user@host pairs, and the default root account only allows localhost."
tldr: "On the server, create an account for your client host: `CREATE USER 'app'@'192.168.1.%' IDENTIFIED BY 'secret'; GRANT ALL ON mydb.* TO 'app'@'192.168.1.%';`. Check existing hosts with `SELECT user, host FROM mysql.user;`. Don't open root to `%` on a public server."
keywords: mysql error 1130 hy000 host is not allowed to connect to this mysql server remote access user host grant create user mariadb docker bind-address
related: [db-mysql-access-denied-for-user-root-localhost, db-mysql-error-2003-cant-connect-to-mysql-server, db-mysql-public-key-retrieval-is-not-allowed]
---
## What it means

In MySQL and MariaDB an account is `'user'@'host'`, not just a user name. When a client connects, the server compares the client's IP (or resolved hostname) with the `host` column of `mysql.user`. If no row matches, it rejects the connection with error 1130 *before* checking the password.

So the network path works (otherwise you'd get error 2003), but the account doesn't allow your address. Typical triggers:

- Connecting remotely as `root`, which by default is `root@localhost` only.
- Connecting from a Docker container or another VM, so the server sees `172.17.0.1` or similar instead of `localhost`.
- An account created for a specific IP, and the client's IP changed.

See which accounts exist (run on the server itself, where localhost works):

```sql
SELECT user, host FROM mysql.user;
```

## Fix 1: create an account for the client's host

Log in locally (`sudo mysql` or `mysql -u root -p` on the server) and create a dedicated user:

```sql
CREATE USER 'app'@'192.168.1.%' IDENTIFIED BY 'a-strong-password';
GRANT ALL PRIVILEGES ON mydb.* TO 'app'@'192.168.1.%';
```

`%` is a wildcard: `'192.168.1.%'` allows a subnet, `'%'` allows any host. Use the narrowest pattern that works. On MySQL 8 you can't create a user implicitly with `GRANT ... IDENTIFIED BY`; run `CREATE USER` first.

`FLUSH PRIVILEGES` is not needed after `CREATE USER`/`GRANT`, only after editing the grant tables directly.

## Fix 2: allow an existing user from another host

To let an existing account in from elsewhere, create the same user name with a new host (it's a separate account with its own password and grants):

```sql
CREATE USER 'root'@'10.0.0.5' IDENTIFIED BY 'a-strong-password';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'10.0.0.5' WITH GRANT OPTION;
```

Or change the host of an existing account:

```sql
RENAME USER 'app'@'localhost' TO 'app'@'%';
```

Avoid `'root'@'%'` on any server reachable from the internet; bots scan port 3306 constantly.

## Fix 3: Docker containers

With the official `mysql` image, the root host is controlled by `MYSQL_ROOT_HOST` (default `%`), but if you created users yourself as `@localhost`, connections from other containers arrive from the bridge network IP. Either create the user with `'%'` or a subnet like `'172.18.%'`, or use the image's variables, which create `'user'@'%'`:

```yaml
services:
  db:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: rootpw
      MYSQL_DATABASE: mydb
      MYSQL_USER: app
      MYSQL_PASSWORD: apppw
```

These variables only take effect on first start with an empty data volume. If the volume already exists, run the SQL from Fix 1 or remove the volume (`docker compose down -v`, which deletes the data).

## Fix 4: hostname vs IP matching

If the account is `'app'@'myhost.example.com'`, the server must reverse-resolve your IP to exactly that name. With `skip_name_resolve=ON` (common in production configs) hostnames in grants never match. Use IP addresses or subnets in the host column instead.

Find the address the server actually sees: the error message shows it (`Host '192.168.1.50'`), and that's the value your account's host must match.

## Still failing after it matches?

Once the host matches you'll get a different error if something else is wrong: `1045 Access denied` for a bad password, or `2003` if `bind-address = 127.0.0.1` in `mysqld.cnf` stops remote connections entirely. Set `bind-address = 0.0.0.0` (and firewall port 3306) to listen on all interfaces, then restart MySQL.
