---
error: "java.net.ConnectException: Connection refused"
error_full: |
  java.net.ConnectException: Connection refused
  	at java.base/sun.nio.ch.Net.pollConnect(Native Method)
  	at java.base/sun.nio.ch.Net.pollConnectNow(Net.java:672)
  	at java.base/sun.nio.ch.NioSocketImpl.timedFinishConnect(NioSocketImpl.java:547)
  	at java.base/java.net.Socket.connect(Socket.java:751)
cat: java
description: "The target host answered, but nothing was listening on that port (the OS sent a TCP reset). The server isn't running, listens on a different port or interface, or you're connecting to the wrong host, often localhost inside Docker."
tldr: "Check the server is up and listening: `ss -ltnp | grep PORT` (or `netstat -ano | findstr PORT` on Windows), and test with `nc -vz HOST PORT`. Fix the host/port in your config. In Docker, use the service name (e.g. `jdbc:mysql://db:3306/app`) instead of `localhost`. Make the server bind to `0.0.0.0` if it's remote."
keywords: java net connectexception connection refused connect spring boot jdbc communications link failure resttemplate httpclient localhost docker port listening 0.0.0.0 kafka redis
related: [java-spring-port-8080-was-already-in-use, db-mysql-error-2003-cant-connect-to-mysql-server, db-postgres-connection-refused]
---
## What it means

The client reached the machine but no process accepted connections on that port, so the operating system rejected it immediately. This is different from:

- `connect timed out` / `SocketTimeoutException`: packets got no answer (firewall, wrong IP, host down).
- `UnknownHostException`: the host name didn't resolve.

Look at the "Caused by" chain to see which component failed: JDBC (`Communications link failure` for MySQL, `Connection to localhost:5432 refused` for PostgreSQL), `RestTemplate`/`WebClient` (`I/O error on GET request`), Kafka, Redis (`Unable to connect to Redis`), etc.

## Step 1: is anything listening?

On the server machine:

```bash
ss -ltnp | grep 8080          # Linux
lsof -iTCP:8080 -sTCP:LISTEN  # macOS
netstat -ano | findstr :8080  # Windows
```

From the client machine:

```bash
nc -vz host 8080
curl -v http://host:8080/
```

## Cause 1: the server isn't running (or crashed)

Start it and check its logs: `systemctl status mysql`, `docker ps`, `docker logs db`. In Spring Boot integration tests, the dependent service (database, mock server) must be up before the application context starts; Testcontainers handles this for you.

## Cause 2: wrong host or port

Print the configured values: a typo in `application.properties`, a profile that overrides them, or a default port (`localhost:8080`) used because a property wasn't set.

```properties
spring.datasource.url=jdbc:postgresql://db.internal:5432/app
app.api.base-url=http://orders:8081
```

## Cause 3: `localhost` inside a Docker container

Inside a container, `localhost` is the container itself. To reach another container in the same Compose project, use its service name:

```yaml
services:
  app:
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://db:3306/app
    depends_on:
      db:
        condition: service_healthy
  db:
    image: mysql:8.4
```

To reach a service on the host from a container, use `host.docker.internal` (Docker Desktop; on Linux add `extra_hosts: ["host.docker.internal:host-gateway"]`).

`depends_on` without a healthcheck only waits for the container to start, not for the database to accept connections, so the app can still get `Connection refused` on boot. Add a healthcheck or retry logic.

## Cause 4: server only listens on 127.0.0.1

If `ss -ltn` shows `127.0.0.1:5432`, remote clients are refused. Bind to all interfaces:

- Spring Boot: `server.address=0.0.0.0` (the default is all interfaces unless set).
- MySQL: `bind-address = 0.0.0.0` in `mysqld.cnf`.
- PostgreSQL: `listen_addresses = '*'`.
- Redis: `bind 0.0.0.0` (and set a password).
- Kafka: `listeners`/`advertised.listeners` must advertise an address clients can reach; a broker advertising `localhost:9092` makes remote clients connect to themselves.

## Cause 5: IPv6 vs IPv4

`localhost` may resolve to `::1` first while the server listens only on IPv4. Use `127.0.0.1` explicitly, or start the JVM with `-Djava.net.preferIPv4Stack=true`.

## Cause 6: Android emulator

In the Android emulator, `localhost` is the emulator. Use `10.0.2.2` to reach the development machine.
