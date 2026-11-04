---
error: "ERR_SSL_PROTOCOL_ERROR"
error_full: |
  This site can't provide a secure connection
  localhost sent an invalid response.
  ERR_SSL_PROTOCOL_ERROR
cat: web
description: The browser started a TLS handshake but the server answered with something that isn't valid TLS, or the handshake failed. Most often you're using https:// against a port that only speaks plain HTTP.
tldr: "If it's localhost or a dev server, use `http://` instead of `https://` (or enable HTTPS in the dev server). Clear HSTS for the domain at `chrome://net-internals/#hsts`. On a real server, test with `openssl s_client -connect example.com:443 -servername example.com` and make sure the 443 server block has `listen 443 ssl;` and a valid certificate."
keywords: err_ssl_protocol_error this site can't provide a secure connection sent an invalid response chrome localhost https hsts nginx listen 443 ssl tls handshake
related: [web-net-err-cert-authority-invalid, web-err-too-many-redirects, web-mixed-content-blocked]
---
## What it means

Chrome (and Edge) show `ERR_SSL_PROTOCOL_ERROR` when the TLS handshake can't complete because the server's reply doesn't follow the protocol. It is not a certificate trust problem (that's `NET::ERR_CERT_AUTHORITY_INVALID`); the connection never got far enough to check the certificate.

Quick test from a terminal:

```bash
openssl s_client -connect example.com:443 -servername example.com </dev/null
```

`wrong version number` in the output means the server is speaking plain HTTP on that port.

## Cause 1: https:// to an HTTP-only port (usually localhost)

`https://localhost:3000` against a dev server that only serves HTTP produces exactly this error, with "localhost sent an invalid response".

## Fix 1: use http, or enable HTTPS in the dev server

```text
http://localhost:3000
```

If you need HTTPS locally, enable it explicitly, e.g. Vite with `@vitejs/plugin-basic-ssl`, `next dev --experimental-https`, or create a trusted cert with `mkcert`:

```bash
mkcert -install
mkcert localhost 127.0.0.1
```

## Cause 2: HSTS forces https for the domain

If you once visited the domain (or `localhost`) over HTTPS with an `Strict-Transport-Security` header, Chrome silently upgrades every request to https, even when you type `http://`. Domains like `.dev` and `.app` are HSTS-preloaded and *always* require HTTPS.

## Fix 2: delete the HSTS entry

Open `chrome://net-internals/#hsts`, enter the domain under "Delete domain security policies" and click Delete. For local development, use `localhost` or `.test` names instead of `.dev`.

## Cause 3: server listens on 443 without SSL enabled

A common nginx mistake:

```nginx
server {
    listen 443;          # wrong: plain HTTP on port 443
    server_name example.com;
}
```

## Fix 3: configure TLS on the 443 listener

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name example.com;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Apache: make sure `mod_ssl` is enabled (`sudo a2enmod ssl`) and the `<VirtualHost *:443>` has `SSLEngine on`.

## Cause 4: no matching TLS version or cipher

Old servers that only support TLS 1.0/1.1, or a config with `ssl_protocols TLSv1;`, fail in modern browsers. Check what the server supports:

```bash
openssl s_client -connect example.com:443 -tls1_2 </dev/null
openssl s_client -connect example.com:443 -tls1_3 </dev/null
```

Use `ssl_protocols TLSv1.2 TLSv1.3;`.

## Cause 5: something in the middle

Antivirus "HTTPS scanning", corporate proxies, captive portals on public Wi‑Fi, or a wrong system clock can break the handshake. Try another network or browser profile, disable HTTPS inspection temporarily, and check that the date and time are correct.
