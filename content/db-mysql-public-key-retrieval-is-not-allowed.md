---
error: "Public Key Retrieval is not allowed"
error_full: |
  java.sql.SQLNonTransientConnectionException: Public Key Retrieval is not allowed
      at com.mysql.cj.jdbc.exceptions.SQLError.createSQLException(SQLError.java:110)
  Caused by: com.mysql.cj.exceptions.UnableToConnectException: Public Key Retrieval is not allowed
cat: database
description: MySQL Connector/J refuses to fetch the server's RSA public key to encrypt the password over a non-TLS connection. It happens with the caching_sha2_password (MySQL 8 default) or sha256_password auth plugins when SSL is disabled.
tldr: "Add `allowPublicKeyRetrieval=true` to the JDBC URL together with `useSSL=false` for local development: `jdbc:mysql://localhost:3306/mydb?allowPublicKeyRetrieval=true&useSSL=false`. In production keep TLS on (`sslMode=REQUIRED`) instead, which avoids the key exchange."
keywords: mysql public key retrieval is not allowed jdbc connector/j allowPublicKeyRetrieval useSSL caching_sha2_password mysql 8 dbeaver spring boot datasource url sslMode
related: [db-mysql-access-denied-for-user-root-localhost, java-classnotfoundexception-com-mysql-cj-jdbc-driver, db-mysql-cant-connect-to-local-mysql-server-through-socket]
---
## What it means

MySQL 8 authenticates users with `caching_sha2_password` by default. The client must send the password either over TLS, or encrypted with the server's RSA public key. With SSL disabled (`useSSL=false`) and no public key configured, Connector/J would have to ask the server for the key. Because that request could be intercepted (a man-in-the-middle could hand out its own key), Connector/J blocks it unless you opt in — hence this error.

It often appears "randomly": once a user has logged in successfully, the server caches the auth and later connections succeed; after a server restart, the cache is empty and the error returns.

## Fix 1: allow public key retrieval (local/dev)

Add `allowPublicKeyRetrieval=true` to the URL:

```
jdbc:mysql://localhost:3306/mydb?allowPublicKeyRetrieval=true&useSSL=false
```

Spring Boot `application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/mydb?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=UTC
spring.datasource.username=app
spring.datasource.password=secret
```

In YAML, quote the URL because of the `&` and `?` characters:

```yaml
spring:
  datasource:
    url: "jdbc:mysql://localhost:3306/mydb?allowPublicKeyRetrieval=true&useSSL=false"
```

**DBeaver / IntelliJ:** edit the connection → *Driver properties* → set `allowPublicKeyRetrieval` to `true` (and `useSSL` to `false` for a local server without TLS).

## Fix 2: use TLS instead (production)

When the connection is encrypted, the password travels inside TLS and no public key is needed. MySQL 8 generates self-signed certificates automatically, so TLS usually works out of the box:

```
jdbc:mysql://db.example.com:3306/mydb?sslMode=REQUIRED
```

For full protection against MITM, verify the certificate with `sslMode=VERIFY_IDENTITY` plus a truststore (`trustCertificateKeyStoreUrl=file:/path/truststore.jks&trustCertificateKeyStorePassword=...`).

In Connector/J 8.0.13+ `sslMode` replaces the older `useSSL`/`requireSSL`/`verifyServerCertificate` properties.

## Fix 3: give the client the server's public key

Safer than retrieval without TLS: copy the key and point the driver at it.

```sql
SHOW STATUS LIKE 'Caching_sha2_password_rsa_public_key';
```

Save the PEM to a file, then:

```
jdbc:mysql://host:3306/mydb?useSSL=false&serverRSAPublicKeyFile=/etc/app/mysql_pub.pem
```

## Fix 4: switch the user to mysql_native_password (legacy)

Only if you can't change the client (very old drivers):

```sql
ALTER USER 'app'@'%' IDENTIFIED WITH mysql_native_password BY 'secret';
```

`mysql_native_password` is deprecated in MySQL 8.0 and disabled by default from 8.4, removed in 9.0 — prefer Fixes 1–3.

## Docker tip

With the `mysql:8` image, a fresh container has an empty auth cache, so the first JDBC connection after every `docker compose up` hits this error. Put `allowPublicKeyRetrieval=true` in the URL for the dev profile, or enable TLS.
