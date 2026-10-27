---
error: "502 Bad Gateway (nginx)"
error_full: |
  502 Bad Gateway
  nginx/1.24.0
cat: web
description: nginx couldn't get a valid response from the app behind it. The app is down, listening on a different address/port, or crashed. The nginx error log tells you which.
tldr: "Check the nginx error log: `sudo tail -n 50 /var/log/nginx/error.log`. Then make sure your app is running and listening on the exact address in `proxy_pass` (e.g. `curl -I http://127.0.0.1:3000`)."
keywords: 502 bad gateway nginx upstream connect failed connection refused php-fpm gunicorn node proxy_pass
related: [linux-address-already-in-use]
---
## What it means

nginx is working, but it's a reverse proxy, and the **upstream** server (your Node/Python/PHP app) didn't answer properly.

## Step 1: read the error log

```bash
sudo tail -n 50 /var/log/nginx/error.log
```

| Log message | Meaning |
|---|---|
| `connect() failed (111: Connection refused) while connecting to upstream` | Nothing listens on that address/port. App down or wrong port. |
| `connect() to unix:/run/php/php8.3-fpm.sock failed (2: No such file or directory)` | PHP-FPM isn't running or the socket path is different |
| `connect() to unix:... failed (13: Permission denied)` | nginx's user can't access the socket |
| `upstream prematurely closed connection` | The app crashed or closed the connection mid-request |
| `upstream sent too big header` | Response headers (often cookies) exceed nginx's buffer |
| `(13: Permission denied) while connecting to upstream` on CentOS/RHEL | SELinux blocks nginx from making network connections |

## Step 2: is the app running where nginx expects?

```bash
grep -R proxy_pass /etc/nginx/sites-enabled/ /etc/nginx/conf.d/
sudo ss -ltnp | grep 3000
curl -I http://127.0.0.1:3000
```

Restart the app (`sudo systemctl restart myapp`, `pm2 restart all`, …) and check its own logs.

**localhost vs 127.0.0.1:** if the app listens only on IPv6 `::1` or only on `127.0.0.1`, `proxy_pass http://localhost:3000` may try the other one. Use the explicit IP that the app binds.

## Fixes for the other cases

**PHP-FPM socket:** check the version and path, then make them match:

```bash
ls /run/php/
sudo systemctl status php8.3-fpm
```

In nginx: `fastcgi_pass unix:/run/php/php8.3-fpm.sock;`

**Socket permissions:** in the FPM pool config (`/etc/php/*/fpm/pool.d/www.conf`) set `listen.owner = www-data` and `listen.group = www-data`, then restart FPM.

**Header too big:**

```nginx
proxy_buffer_size 16k;
proxy_buffers 8 16k;
```

**SELinux:** `sudo setsebool -P httpd_can_network_connect 1`.

## Docker

Inside a container, `127.0.0.1` is the container itself. Proxy to the service name on the shared Docker network (`proxy_pass http://app:3000;`), and make sure the app listens on `0.0.0.0`, not `127.0.0.1`.

## 504 instead of 502?

504 Gateway Timeout means the upstream accepted the connection but took too long. Raise `proxy_read_timeout`, or make the request faster.
