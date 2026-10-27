---
error: "psql: error: connection to server at \"localhost\" (127.0.0.1), port 5432 failed: Connection refused"
error_full: |
  psql: error: connection to server at "localhost" (127.0.0.1), port 5432 failed: Connection refused
          Is the server running on that host and accepting TCP/IP connections?
cat: database
description: Nothing is listening on that host and port. PostgreSQL isn't running, listens on another port/address, or is in a container that doesn't publish the port.
tldr: "Start the server: `sudo systemctl start postgresql` and check `sudo systemctl status postgresql`. Then verify the port with `sudo ss -ltnp | grep 5432`."
keywords: postgres connection refused is the server running on that host accepting tcp ip connections port 5432 listen_addresses docker
related: [db-postgres-password-authentication-failed]
---
## What it means

The TCP connection was actively refused: nothing is listening at that address and port. Authentication hasn't even started.

## Step 1: is PostgreSQL running?

```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

On Debian/Ubuntu each cluster has its own unit: `pg_lsclusters` shows clusters, ports and status. Start one with `sudo pg_ctlcluster 16 main start`.

macOS Homebrew: `brew services start postgresql@16`.

If it won't start, read the log: `sudo journalctl -u postgresql -n 50` or `/var/log/postgresql/`.

## Step 2: which port and address?

```bash
sudo ss -ltnp | grep postgres
```

A second installed version often takes port **5433**. Connect with `-p 5433` or change `port` in `postgresql.conf`.

## Step 3: connecting from another machine or container

By default PostgreSQL listens only on `localhost`. In `postgresql.conf`:

```ini
listen_addresses = '*'
```

and allow the client network in `pg_hba.conf`:

```text
host  all  all  10.0.0.0/24  scram-sha-256
```

Restart PostgreSQL, and open port 5432 in the firewall only for trusted networks.

## Docker

- Publish the port: `docker run -p 5432:5432 postgres`.
- From **another container**, `localhost` means that container itself. Use the service name as the host (`db`, as defined in `compose.yaml`).
- `depends_on` doesn't wait for PostgreSQL to be ready. Add a healthcheck with `pg_isready` and use `condition: service_healthy`, or retry in your app.

## Unix socket version of this error

`connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: No such file or directory` means the same thing over the socket: the server isn't running, or it uses another port (the port number is part of the socket name).
