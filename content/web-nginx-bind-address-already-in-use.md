---
error: "nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)"
error_full: |
  nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
  nginx: [emerg] bind() to [::]:80 failed (98: Address already in use)
  nginx: [emerg] still could not bind()
cat: web
description: Another process (Apache, another nginx, a Docker container, a dev server) already listens on port 80 or 443, or nginx is already running and you started a second copy. Find the owner of the port and stop it or move it.
tldr: "See who has the port: `sudo ss -ltnp 'sport = :80'`. If it's Apache: `sudo systemctl disable --now apache2`. If it's an old nginx: `sudo systemctl stop nginx; sudo pkill nginx; sudo systemctl start nginx`. If it's a container, stop it or change its `-p` mapping. Use `nginx -s reload` (or `systemctl reload nginx`) after config changes instead of starting nginx again."
keywords: nginx emerg bind to 0.0.0.0:80 failed 98 address already in use still could not bind port 80 443 apache2 docker ipv6 listen [::]:80
related: [linux-address-already-in-use, web-nginx-502-bad-gateway, docker-port-is-already-allocated]
---
## What it means

nginx tries to open a listening socket for every `listen` directive. Error 98 (`EADDRINUSE`) means something already holds that address and port. After a few retries nginx gives up with `still could not bind()`.

Find the process:

```bash
sudo ss -ltnp 'sport = :80'
sudo ss -ltnp 'sport = :443'
# alternative
sudo lsof -i :80 -sTCP:LISTEN
```

Look at the `users:(("name",pid=...))` part.

## Cause 1: nginx is already running

Very common: nginx was started by systemd, then you ran `sudo nginx` by hand (or the other way round). The second copy can't bind.

```bash
ps aux | grep [n]ginx
```

To apply config changes, reload the running instance instead of starting another:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

If an orphaned nginx (not managed by systemd) holds the port:

```bash
sudo systemctl stop nginx
sudo pkill -x nginx        # or: sudo nginx -s quit
sudo systemctl start nginx
```

## Cause 2: Apache (or another web server) is installed

On Ubuntu/Debian, installing a package can pull in `apache2`, which starts on port 80.

```bash
sudo systemctl disable --now apache2     # RHEL/Fedora: httpd
sudo systemctl restart nginx
```

Or keep both and run one on a different port (change `Listen 80` in `/etc/apache2/ports.conf`, or `listen 8080;` in nginx).

Other usual suspects: Caddy, Traefik, lighttpd, HAProxy, Varnish, a control panel, or `snap` services.

## Cause 3: a Docker container publishes the port

`docker-proxy` in the `ss` output means a container mapped `-p 80:80`:

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | grep ':80->'
docker stop <name>
```

Or change the mapping (e.g. `-p 8080:80`) and proxy to it from host nginx.

## Cause 4: duplicate listen in your own config

nginx can conflict with itself. The classic case is `listen [::]:80 ipv6only=off;` (a dual-stack socket that also takes IPv4) together with `listen 80;` in another server block: both want IPv4 port 80, so the second bind fails with error 98. Show the full config and search for listens:

```bash
sudo nginx -T 2>/dev/null | grep -n "listen"
```

Typical clean setup for each server block: `listen 80;` and `listen [::]:80;`. Options like `default_server`, `reuseport` or `ipv6only` may appear only once per address:port. Check for leftover files in `/etc/nginx/sites-enabled/` and `/etc/nginx/conf.d/` too.

## Cause 5: port 443 held by something else

Same commands with `:443`. If a VPN, Skype, or another proxy uses 443, stop it or move it.

## After fixing

```bash
sudo nginx -t
sudo systemctl restart nginx
systemctl status nginx
curl -I http://localhost
```
