---
error: "nginx: [emerg] unknown directive"
error_full: |
  nginx: [emerg] unknown directive "proxy_pas" in /etc/nginx/sites-enabled/default:12
  nginx: configuration file /etc/nginx/nginx.conf test failed
cat: web
description: "nginx doesn't recognize a word at the start of a config line. It's a typo, a directive from a module that isn't compiled in or loaded, an invisible character (BOM, smart quote), or a missing semicolon on the previous line."
tldr: "Open the file at the reported line and check spelling and the previous line's `;`. For module directives (`more_set_headers`, `brotli`, `geoip2`, `headers_more`) install and load the module (`load_module modules/ngx_http_headers_more_filter_module.so;`) or remove the directive. Strip BOMs/CRLF with `sed -i '1s/^\\xEF\\xBB\\xBF//' file` and `dos2unix file`. Test with `sudo nginx -t`."
keywords: nginx emerg unknown directive configuration file test failed typo load_module more_set_headers brotli geoip2 ssl http2 bom crlf nginx -t sites-enabled
related: [web-nginx-502-bad-gateway, web-nginx-conflicting-server-name-ignored, web-nginx-bind-address-already-in-use]
---
## What it means

Every statement in nginx config starts with a directive name. If the name isn't known to this nginx binary (core or any loaded module), `nginx -t` fails with `unknown directive "name" in file:line` and nginx refuses to start or reload.

Always test before reloading:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Cause 1: typo

`proxy_pas`, `sever_name`, `listne`, `client_max_body_size` written as `client_body_max_size`... Fix the spelling at the reported line. The [nginx directive index](https://nginx.org/en/docs/dirindex.html) lists every valid name.

## Cause 2: missing semicolon on the previous line

```nginx
root /var/www/html      # no ;
index index.html;
```

nginx reads `root /var/www/html index index.html;` as one statement. Usually this produces `invalid number of arguments`, but if the following token is then parsed as a directive name you'll get `unknown directive`. Check the line **before** the reported one too.

## Cause 3: directive from a module that isn't loaded

Common ones: `more_set_headers` / `more_clear_headers` (headers-more), `brotli` (ngx_brotli), `geoip2`, `vhost_traffic_status`, `lua_*` / `content_by_lua_block` (OpenResty), `njs` `js_*`.

Check what your build has:

```bash
nginx -V 2>&1 | tr ' ' '\n' | grep -E 'module|add-'
ls /etc/nginx/modules-enabled/ /usr/lib/nginx/modules/ 2>/dev/null
```

Install the dynamic module and load it at the top of `nginx.conf` (outside `http {}`):

```bash
sudo apt install libnginx-mod-http-headers-more-filter   # Debian/Ubuntu
```

```nginx
load_module modules/ngx_http_headers_more_filter_module.so;
```

Debian packages usually add this to `modules-enabled/` automatically. For built-in alternatives use `add_header` instead of `more_set_headers`. For Lua directives, use OpenResty.

## Cause 4: directive too new for your nginx version

Examples: `http2 on;` (needs 1.25.1+; older versions use `listen 443 ssl http2;`), `quic`/`http3` (1.25+), `ssl_conf_command` (1.19.4+). Check `nginx -v` and either upgrade (nginx.org mainline repo) or use the older syntax.

## Cause 5: invisible characters

Files edited on Windows or copied from web pages can contain a UTF-8 BOM, CRLF line endings or non-breaking spaces. The error then shows a strange name like `unknown directive "﻿server"` or `"server "`.

```bash
cat -A /etc/nginx/sites-available/mysite | head    # shows ^M and M-BM-
sed -i '1s/^\xEF\xBB\xBF//' /etc/nginx/sites-available/mysite
dos2unix /etc/nginx/sites-available/mysite
```

Our [line ending and whitespace inspector](/tools/line-ending-whitespace-inspector/) shows BOMs, CRLF and non-breaking spaces in pasted text.

## Cause 6: not an nginx file

Apache syntax (`<VirtualHost>`, `RewriteRule`) or a `.htaccess` included by a wildcard like `include /etc/nginx/conf.d/*;` produces `unknown directive`. Make includes specific (`conf.d/*.conf`) and translate Apache rules to nginx (`rewrite`, `try_files`, `return`).
