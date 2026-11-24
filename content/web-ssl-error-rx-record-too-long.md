---
error: "SSL_ERROR_RX_RECORD_TOO_LONG"
error_full: |
  Secure Connection Failed
  An error occurred during a connection to example.com. SSL received a record that exceeded the maximum permissible length.
  Error code: SSL_ERROR_RX_RECORD_TOO_LONG
cat: web
description: "Firefox expected a TLS handshake but the server answered with plain HTTP (or another non-TLS protocol) on that port. Almost always a server misconfiguration: HTTPS port without SSL enabled, or https:// used on an HTTP-only port."
tldr: "Test with `curl -v http://example.com:443/`: if you get an HTTP response, the port speaks plain HTTP. In nginx use `listen 443 ssl;` (not just `listen 443;`) with `ssl_certificate` set; in Apache enable `mod_ssl` and a `<VirtualHost *:443>` with `SSLEngine on`. If it's your dev server, open `http://` instead of `https://`."
keywords: ssl_error_rx_record_too_long firefox secure connection failed ssl received a record that exceeded the maximum permissible length nginx listen 443 ssl apache sslengine mod_ssl https on http port proxy wrong version number
related: [web-err-ssl-protocol-error, web-nginx-502-bad-gateway, web-curl-60-ssl-certificate-problem]
---
## What it means

A TLS record has a 5-byte header containing a length. When the server sends `HTTP/1.1 400 Bad Request` instead of TLS, Firefox reads the text bytes as a header, gets an absurd length, and reports a record that is "too long". Chrome shows the same situation as `ERR_SSL_PROTOCOL_ERROR`; curl and OpenSSL say `wrong version number`.

Confirm from a terminal:

```bash
curl -v https://example.com/         # SSL routines::wrong version number
curl -v http://example.com:443/      # gets an HTTP answer = port 443 speaks plain HTTP
openssl s_client -connect example.com:443 -servername example.com
```

## Cause 1: nginx listens on 443 without `ssl`

```nginx
server {
    listen 443;              # wrong: plain HTTP on port 443
    server_name example.com;
}
```

Fix:

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;                # nginx 1.25.1+; older: listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Every `server` block listening on 443 needs `ssl`; one block without it can make that port plain HTTP for the default server. Search with `sudo nginx -T | grep -n 'listen'`.

## Cause 2: Apache without mod_ssl or the SSL vhost

```bash
sudo a2enmod ssl
sudo a2ensite default-ssl      # or your own *:443 vhost
sudo apachectl configtest && sudo systemctl reload apache2
```

The 443 vhost needs:

```apache
<VirtualHost *:443>
    ServerName example.com
    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem
</VirtualHost>
```

If `Listen 443` exists but no vhost has `SSLEngine on`, Apache serves HTTP on 443. `sudo certbot --apache -d example.com` sets this up automatically.

## Cause 3: you used https:// on an HTTP-only port

Dev servers (`localhost:3000`, `:8080`, Django `runserver`, Flask) speak plain HTTP. Typing `https://localhost:3000` gives this error. Use `http://`. If the browser keeps upgrading to HTTPS, it's HSTS or Firefox's HTTPS-Only mode: add an exception, or clear the site's data. Some apps also redirect to `https://` themselves (e.g. Django `SECURE_SSL_REDIRECT = True`, Rails `force_ssl`) without TLS in front of them.

## Cause 4: reverse proxy / load balancer misconfiguration

If TLS terminates at a load balancer or Cloudflare, the backend gets plain HTTP. Problems appear when:

- a load balancer listener on 443 is set to TCP/HTTP pass-through to a backend that doesn't do TLS;
- a port forward on your router maps external 443 to the backend's port 80;
- Docker maps `-p 443:80`.

Point 443 at a port that actually terminates TLS, or terminate TLS at the proxy.

## Cause 5: proxy settings in the browser

A misconfigured HTTP proxy in Firefox (*Settings > Network Settings*) or an antivirus doing HTTPS inspection can answer in plain text. Test with *No proxy* and with the antivirus web shield off.
