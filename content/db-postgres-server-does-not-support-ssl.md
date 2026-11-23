---
error: "server does not support SSL, but SSL was required"
error_full: |
  psql: error: connection to server at "db.example.com" (10.0.0.5), port 5432 failed: server does not support SSL, but SSL was required
  FATAL: no pg_hba.conf entry for host "203.0.113.7", user "app", database "app", no encryption
  FATAL: SSL connection is required. Please specify SSL options and retry.
cat: database
description: "Client and server disagree about TLS. Either the client demands SSL (`sslmode=require`) and the server has `ssl = off`, or the server only accepts SSL (`hostssl` rules, managed cloud databases) and the client connected without it."
tldr: "Server without SSL (local/Docker dev): connect with `sslmode=disable`, e.g. `postgresql://user:pass@host/db?sslmode=disable`. Server that requires SSL (RDS, Azure, Heroku, Supabase, Neon): connect with `sslmode=require` (or `verify-full` with the provider's CA). To enable SSL on your own server set `ssl = on` with `ssl_cert_file`/`ssl_key_file` in postgresql.conf and restart."
keywords: postgres server does not support ssl but ssl was required sslmode require disable verify-full ssl connection is required no encryption pg_hba hostssl rds azure heroku node-postgres psycopg2 prisma
related: [db-postgres-no-pg-hba-conf-entry-for-host, db-postgres-connection-refused, db-postgres-password-authentication-failed]
---
## What it means

The PostgreSQL client opens a connection and asks "SSL?". Depending on `sslmode`:

| sslmode | Behaviour |
|---|---|
| `disable` | never use SSL |
| `prefer` (libpq default) | try SSL, fall back to plain |
| `require` | SSL or fail (no certificate check) |
| `verify-ca` / `verify-full` | SSL plus certificate (and hostname) check |

`server does not support SSL, but SSL was required` is the client giving up because the server said no. The reverse messages (`no encryption` in a pg_hba error, or a provider's `SSL connection is required`) are the server rejecting a non-SSL client.

## Case 1: server has no SSL (local, Docker, CI)

The official `postgres` Docker image ships with `ssl = off`. Some tools default to `require` (e.g. some hosted-app templates set `PGSSLMODE=require`, or a `DATABASE_URL` copied from production includes `?sslmode=require`).

Connect without SSL:

```bash
psql "postgresql://app:secret@localhost:5432/app?sslmode=disable"
# or
PGSSLMODE=disable psql -h localhost -U app app
```

node-postgres:

```js
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
```

Check whether the server has SSL on:

```sql
SHOW ssl;
```

## Case 2: server requires SSL (cloud providers, hostssl)

Managed Postgres (AWS RDS with `rds.force_ssl=1`, Azure Flexible Server, Heroku, Supabase, Neon, Render) rejects plain connections. Add `sslmode=require`:

```bash
psql "postgresql://app:pass@mydb.xxxx.rds.amazonaws.com:5432/app?sslmode=require"
```

psycopg2 / psycopg:

```python
psycopg2.connect(dsn, sslmode="require")
```

node-postgres (`pg`). Note `ssl: true` verifies the certificate, which fails for self-signed/provider CAs not in Node's store:

```js
// encrypted, no cert check (similar to sslmode=require)
new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// encrypted and verified (better): download the provider's CA bundle
new Pool({ connectionString, ssl: { ca: fs.readFileSync('global-bundle.pem', 'utf8') } });
```

JDBC: `jdbc:postgresql://host:5432/app?sslmode=require`.

Prisma: `postgresql://...?sslmode=require` in `DATABASE_URL`.

For full protection against man-in-the-middle, use `sslmode=verify-full&sslrootcert=/path/to/ca.pem` with the CA your provider publishes.

## Case 3: your own server, pg_hba.conf has hostssl only

```
hostssl  app  app  0.0.0.0/0  scram-sha-256
```

`hostssl` lines only match SSL connections, so a plain client gets `no pg_hba.conf entry ... no encryption`. Either connect with SSL or add a `host` line (only on trusted networks), then `SELECT pg_reload_conf();`. See [no pg_hba.conf entry for host](/database/db-postgres-no-pg-hba-conf-entry-for-host/).

## Enabling SSL on your own server

```bash
cd /var/lib/postgresql/data   # or your data directory
openssl req -new -x509 -days 365 -nodes -text \
  -out server.crt -keyout server.key -subj "/CN=db.example.com"
chown postgres:postgres server.key server.crt
chmod 600 server.key
```

In `postgresql.conf`:

```ini
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

Reload (`SELECT pg_reload_conf();`) and check `SHOW ssl;` returns `on`. Use a certificate from a real CA (or your internal CA) if clients use `verify-full`.

## Through PgBouncer or a proxy

The client talks TLS to PgBouncer, not Postgres. Configure `client_tls_sslmode` / `client_tls_key_file` in pgbouncer.ini, or connect with `sslmode=disable` if the bouncer is local.
