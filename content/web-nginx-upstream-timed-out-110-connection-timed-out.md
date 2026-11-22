---
error: "upstream timed out (110: Connection timed out) while reading response header from upstream"
error_full: |
  2026/11/22 10:15:30 [error] 1234#1234: *5678 upstream timed out (110: Connection timed out) while reading response header from upstream, client: 203.0.113.7, server: example.com, request: "GET /report HTTP/1.1", upstream: "http://127.0.0.1:3000/report", host: "example.com"
  upstream timed out (110: Connection timed out) while connecting to upstream
cat: web
description: "Nginx waited longer than its proxy timeout (60s by default) for the backend. The client gets 504 Gateway Timeout. Either the backend is too slow for that request, or it's unreachable."
tldr: "Check which phase timed out. For `while reading response header`, speed up the backend or raise `proxy_read_timeout 300s;` (or `fastcgi_read_timeout` for PHP-FPM, `uwsgi_read_timeout`) and the backend's own timeout (gunicorn `--timeout`, PHP `max_execution_time`). For `while connecting to upstream`, the backend address is unreachable: check it's running and the firewall."
keywords: nginx upstream timed out 110 connection timed out while reading response header from upstream while connecting to upstream 504 gateway timeout proxy_read_timeout fastcgi_read_timeout proxy_connect_timeout gunicorn php-fpm
related: [web-504-gateway-timeout, web-nginx-502-bad-gateway, web-nginx-499-client-closed-request]
---
## What it means

This line is in the Nginx **error log** (`/var/log/nginx/error.log`) whenever a proxied request returns `504 Gateway Timeout`. Error `110` is the Linux `ETIMEDOUT` code. The words after it tell you which phase ran out of time:

| Phase | Directive (default 60s) | Usual cause |
|---|---|---|
| `while connecting to upstream` | `proxy_connect_timeout` | backend unreachable: wrong IP, firewall, host down |
| `while reading response header from upstream` | `proxy_read_timeout` | backend accepted the request but is slow to answer |
| `while sending request to upstream` | `proxy_send_timeout` | backend not reading the request body (overloaded) |

The `upstream:` field shows the exact backend address that was used.

## Fix 1: make the slow request faster

Before raising timeouts, check why the endpoint takes over 60 seconds: slow database queries, calls to external APIs, large exports. Measure directly against the backend:

```bash
curl -o /dev/null -s -w '%{time_total}\n' http://127.0.0.1:3000/report
```

Long jobs (reports, imports, video processing) belong in a background queue; return `202 Accepted` and let the client poll.

## Fix 2: raise the timeout for that location

```nginx
location /report {
    proxy_pass http://127.0.0.1:3000;
    proxy_connect_timeout 10s;
    proxy_read_timeout    300s;
    proxy_send_timeout    300s;
}
```

For PHP-FPM use the FastCGI directive instead; `proxy_read_timeout` has no effect on `fastcgi_pass`:

```nginx
location ~ \.php$ {
    include fastcgi_params;
    fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    fastcgi_read_timeout 300s;
}
```

For uWSGI: `uwsgi_read_timeout 300s;`. Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Fix 3: raise the backend's timeout too

Otherwise the backend kills the request first and Nginx reports `502` / `upstream prematurely closed connection` instead:

- gunicorn: `gunicorn --timeout 300 app:app` (default 30s)
- PHP: `max_execution_time` in php.ini, `request_terminate_timeout` in the FPM pool
- Node: `server.requestTimeout` (default 300s in Node 18+), `server.headersTimeout`
- uWSGI: `harakiri = 300`

Anything in front of Nginx (Cloudflare: 100s on free plans, AWS ALB idle timeout: 60s default) needs to allow the longer time as well.

## Fix 4: backend unreachable (`while connecting to upstream`)

The request never reached the app. Check from the Nginx host:

```bash
nc -vz 10.0.0.12 3000
ss -ltnp | grep 3000        # on the backend host
```

- App not listening on that interface: bind to `0.0.0.0` instead of `127.0.0.1` if Nginx is on another machine.
- Firewall/security group drops packets (a drop gives timeout; a closed port gives `connection refused` → 502).
- Stale DNS: Nginx resolves `proxy_pass` host names once at start-up. If the backend IP changed (containers, cloud load balancers), reload Nginx, or use a `resolver` with a variable in `proxy_pass` to re-resolve.

## Fix 5: backend overloaded

If many requests time out at once, workers are saturated. Check CPU/memory and worker counts (gunicorn `--workers`, FPM `pm.max_children`; FPM logs `server reached pm.max_children setting`). Add workers or capacity, and fix the slow queries that tie them up.
