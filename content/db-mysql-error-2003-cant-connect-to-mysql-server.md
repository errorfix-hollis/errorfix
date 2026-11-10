---
error: "ERROR 2003 (HY000): Can't connect to MySQL server on 'host' (111)"
error_full: |
  ERROR 2003 (HY000): Can't connect to MySQL server on '127.0.0.1:3306' (111)
  ERROR 2003 (HY000): Can't connect to MySQL server on '10.0.0.5' (110)
  ERROR 2003 (HY000): Can't connect to MySQL server on 'localhost' (10061)
cat: database
description: "The client could not open a TCP connection to the MySQL server. The number in parentheses tells you why: 111/10061 = connection refused (nothing listening), 110/10060 = timed out (firewall or wrong host)."
tldr: "Check the server is running (`sudo systemctl status mysql`) and listening on the right address (`sudo ss -ltnp | grep 3306`). For remote access set `bind-address = 0.0.0.0` in mysqld.cnf, restart, and open port 3306 in the firewall/security group. In Docker, connect to the service name, not localhost."
keywords: mysql error 2003 hy000 cant connect to mysql server on 111 110 10061 10060 connection refused bind-address 3306 remote docker
related: [db-mysql-cant-connect-to-local-mysql-server-through-socket, db-mysql-access-denied-for-user-root-localhost, db-postgres-connection-refused]
---
## What it means

Error 2003 is a **network-level** failure: the client never reached MySQL's login step. The code in parentheses is the OS error:

| Code | Meaning | Usual cause |
|---|---|---|
| 111 (Linux), 61 (macOS), 10061 (Windows) | Connection refused | MySQL not running, or not listening on that IP/port |
| 110 (Linux), 60 (macOS), 10060 (Windows) | Timed out | Firewall drops packets, wrong IP, server unreachable |
| 113 | No route to host | Network/firewall rejects it |

If you instead see `ERROR 2002 ... through socket`, the client used a Unix socket — see [Can't connect through socket](/database/db-mysql-cant-connect-to-local-mysql-server-through-socket/). If you get `ERROR 1045 Access denied`, networking works and it's a credentials problem.

## Cause 1: the server isn't running

```bash
sudo systemctl status mysql     # or mysqld / mariadb
sudo systemctl start mysql
sudo journalctl -u mysql -n 50  # why it didn't start
```

Common reasons it fails to start: full disk, bad config line, or port 3306 already taken.

## Cause 2: it's listening on a different address or port

```bash
sudo ss -ltnp | grep mysqld
```

`127.0.0.1:3306` means only local connections are accepted. To allow remote clients, edit `/etc/mysql/mysql.conf.d/mysqld.cnf` (Debian/Ubuntu) or `/etc/my.cnf`:

```ini
[mysqld]
bind-address = 0.0.0.0
```

```bash
sudo systemctl restart mysql
```

Also check for `skip-networking` (disables TCP entirely) and a non-default `port`. Connect with the right port explicitly: `mysql -h 10.0.0.5 -P 3307 -u app -p`.

After opening it up, the user must be allowed from remote hosts (`'app'@'%'`, not just `'app'@'localhost'`), otherwise you'll get error 1130 `Host ... is not allowed to connect`.

## Cause 3: firewall or cloud security group (code 110)

```bash
sudo ufw allow from 203.0.113.0/24 to any port 3306   # restrict to your network
nc -vz 10.0.0.5 3306                                   # test from the client
```

On AWS/GCP/Azure, add an inbound rule for TCP 3306 in the security group / firewall rules. For RDS, also check that the instance is "publicly accessible" if connecting from outside the VPC. Don't expose 3306 to the whole internet; use an SSH tunnel instead:

```bash
ssh -L 3306:127.0.0.1:3306 user@dbhost
mysql -h 127.0.0.1 -u app -p
```

## Cause 4: Docker networking

Inside a container, `localhost` is the container itself. With Docker Compose, use the service name as host:

```yaml
services:
  db:
    image: mysql:8.4
  app:
    environment:
      DB_HOST: db
```

From the host machine, publish the port (`ports: ["3306:3306"]`) and connect to `127.0.0.1`. If the app starts before MySQL finishes initializing, you get 111 for the first seconds — add a healthcheck with `depends_on: condition: service_healthy` or retry in the app.

## Cause 5: localhost vs 127.0.0.1

The `mysql` client treats `-h localhost` as "use the Unix socket", and `-h 127.0.0.1` as TCP. If one works and the other doesn't, the server is either not listening on TCP or the socket path differs.
