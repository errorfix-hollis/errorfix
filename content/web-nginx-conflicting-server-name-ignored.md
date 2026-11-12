---
error: "nginx: [warn] conflicting server name \"example.com\" on 0.0.0.0:80, ignored"
error_full: |
  nginx: [warn] conflicting server name "example.com" on 0.0.0.0:80, ignored
  nginx: [warn] conflicting server name "www.example.com" on [::]:443, ignored
  nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
  nginx: configuration file /etc/nginx/nginx.conf test is successful
cat: web
description: "Two server blocks listen on the same address:port with the same server_name. nginx uses the first one it loads and ignores the duplicate, so your changes in the second block silently have no effect."
tldr: "Find the duplicates: `sudo nginx -T 2>/dev/null | grep -nE 'server_name|listen|# configuration file'`. Remove or merge one of them; usually a leftover copy in sites-enabled (e.g. `default` plus `example.com`, or a `.bak` file that is still included, or a Certbot-added block). Then `sudo nginx -t && sudo systemctl reload nginx`."
keywords: nginx warn conflicting server name on 0.0.0.0 80 443 ignored duplicate server_name sites-enabled sites-available certbot default server block nginx -T
related: [web-nginx-could-not-build-server-names-hash, web-nginx-bind-address-already-in-use, web-err-too-many-redirects]
---
## What it means

For every `listen` address:port, nginx builds a table of server names. If two `server { }` blocks listening on the same address:port both claim `example.com`, the **first one loaded wins** and nginx logs this warning for the second. It's only a `[warn]`: `nginx -t` still succeeds and nginx starts, which is why it often goes unnoticed, while edits to the ignored block (new `location`, SSL settings, redirects) seem to do nothing.

Find every block that claims the name, with the file it comes from:

```bash
sudo nginx -T 2>/dev/null | grep -nE '# configuration file|server_name|listen'
```

`nginx -T` dumps the full effective config including all `include`d files, in load order.

## Cause 1: the same site is enabled twice

On Debian/Ubuntu layouts, everything in `/etc/nginx/sites-enabled/` is loaded (`include /etc/nginx/sites-enabled/*;`). Typical duplicates:

- `example.com` and `example.com.bak`, `example.com.old`, `example.com~` (editor backup)
- a symlink **and** a copy of the same file
- a file in both `sites-enabled/` and `conf.d/`

```bash
ls -l /etc/nginx/sites-enabled/ /etc/nginx/conf.d/
```

Remove the extra one (keep backups outside the include path):

```bash
sudo rm /etc/nginx/sites-enabled/example.com.bak
sudo nginx -t && sudo systemctl reload nginx
```

On RHEL-style layouts only `conf.d/*.conf` is included, so `example.conf.bak` is ignored there, but `example.conf` and `example2.conf` with the same names still conflict.

## Cause 2: Certbot added a block

`certbot --nginx` may add a new `server { listen 80; server_name example.com; return 301 https://...; }` block at the end of your file. If you already had your own port-80 block for the same name, you now have two. Keep one port-80 block that redirects, and one `listen 443 ssl` block that serves:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name example.com www.example.com;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    # ...
}
```

## Cause 3: the name appears in two different sites

E.g. `www.example.com` in both `example.com.conf` and a separate `www-redirect.conf`, or `localhost`/`_` used in several blocks. Each name may appear once per address:port. Decide which block owns it and remove it from the other's `server_name` line.

`server_name _;` is not special; it's just an invalid name used by convention. Two blocks with `server_name _` on the same port conflict too. To choose the catch-all, use `default_server` on the `listen` line instead (only one per address:port):

```nginx
listen 80 default_server;
```

## Cause 4: different `listen` forms still overlap

`listen 80;` and `listen 0.0.0.0:80;` are the same socket. However `listen 80;` and `listen 192.0.2.10:80;` are different, so no warning appears; but requests to that IP are handled only by the specific-IP block. If a change "doesn't apply", check for this too.

## Verify

```bash
sudo nginx -t 2>&1 | grep -i conflicting || echo "no conflicts"
sudo systemctl reload nginx
curl -sI -H 'Host: example.com' http://127.0.0.1/ | head -5
```

If you also see `could not build server_names_hash`, that's a different limit; see [server_names_hash error](/web/web-nginx-could-not-build-server-names-hash/).
