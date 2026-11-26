---
error: "nginx: [emerg] no \"ssl_certificate\" is defined for the \"listen ... ssl\" directive"
error_full: |
  nginx: [emerg] no "ssl_certificate" is defined for the "listen ... ssl" directive in /etc/nginx/sites-enabled/default:22
  nginx: configuration file /etc/nginx/nginx.conf test failed
  [error] no "ssl_certificate" is defined in server listening on SSL port while SSL handshaking
cat: web
description: "A server block has listen 443 ssl (or another port with ssl) but no ssl_certificate and ssl_certificate_key directive applies to it, either in that block or inherited from the http block."
tldr: "Add the certificate to every server block that listens with ssl: `ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;` and `ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;`, or remove `ssl` from the listen line. Then `sudo nginx -t && sudo systemctl reload nginx`."
keywords: nginx emerg no ssl_certificate is defined for the listen ssl directive 443 certbot letsencrypt default_server ssl_reject_handshake nginx -t
related: [web-nginx-unknown-directive, web-nginx-bind-address-already-in-use, web-ssl-error-rx-record-too-long]
---
## What it means

Every `server` block that accepts TLS (`listen 443 ssl;`, `listen [::]:443 ssl;`, `listen 8443 ssl http2;`) needs a certificate and key. Since nginx 1.15.9 the config test fails at startup (`[emerg]`) if one is missing; older versions failed later, during the handshake, with the `[error] ... while SSL handshaking` variant.

The line number in the message points to the `listen` directive of the offending block. Find all SSL listeners:

```bash
sudo nginx -T 2>/dev/null | grep -nE 'listen .*ssl|ssl_certificate|server_name|# configuration file'
```

## Cause 1: certificate lines missing from the block

Often you copied an HTTP server block and only changed the listen line.

## Fix 1: add the certificate and key

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;                      # nginx 1.25.1+; older: listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ...
}
```

If you don't have a certificate yet, get one with Certbot first (it can edit the config for you):

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Then test and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Cause 2: certbot removed or never wrote the lines

After a failed `certbot --nginx` run, or when Certbot couldn't match `server_name`, the block keeps `listen 443 ssl` without certificate paths. Check `ls /etc/letsencrypt/live/` for the certificate name and add the paths manually, or rerun `sudo certbot install --cert-name example.com`.

## Cause 3: a default/catch-all SSL server without a certificate

A `default_server` on 443 meant to reject unknown hosts still needs a certificate — unless you use `ssl_reject_handshake` (nginx 1.19.4+):

```nginx
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    ssl_reject_handshake on;
}
```

This rejects TLS for unmatched names without needing any certificate.

## Cause 4: ssl on a port that should be plain HTTP

`listen 80 ssl;` or `listen 8080 ssl;` behind a TLS-terminating load balancer. If TLS is handled elsewhere (Cloudflare, AWS ALB, Kubernetes ingress), remove `ssl` from the listen line:

```nginx
listen 80;
```

## Cause 5: certificate defined in an included file that isn't loaded

The paths may live in a snippet such as `include snippets/ssl-example.com.conf;` or `/etc/letsencrypt/options-ssl-nginx.conf` (note: the Certbot options file contains protocol/cipher settings, not the certificate paths). Make sure the include is inside the right `server` block and the file exists.

## Shared certificate for all blocks

You can put `ssl_certificate` / `ssl_certificate_key` in the `http {}` block; every server inherits them unless it sets its own. Useful for a wildcard certificate, but clients will get a name mismatch for hosts not covered by it.
