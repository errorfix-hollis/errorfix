---
error: "403 Forbidden nginx"
error_full: |
  403 Forbidden
  nginx/1.24.0
  [error] 1234#1234: *1 directory index of "/var/www/html/" is forbidden
  [error] 1234#1234: *1 open() "/var/www/site/index.html" failed (13: Permission denied)
cat: web
description: nginx refused to serve the request. Usually there is no index file and autoindex is off, nginx's worker user cannot read the files or traverse a parent directory, SELinux blocks access, or a deny/allow rule matches.
tldr: "Check `sudo tail /var/log/nginx/error.log`. For `directory index ... is forbidden` add an `index.html` or fix the `index` directive. For `(13: Permission denied)` make files readable and every parent directory executable by the nginx user (`namei -l /path/to/file`, `chmod o+x` on dirs). On RHEL/Fedora run `sudo restorecon -Rv /var/www`."
keywords: nginx 403 forbidden directory index is forbidden permission denied 13 www-data selinux httpd_sys_content_t autoindex index.html try_files deny all root home directory
related: [web-nginx-502-bad-gateway, web-nginx-413-request-entity-too-large, linux-permission-denied-running-script]
---
## What it means

nginx found the location but decided not to serve it. The browser only shows "403 Forbidden"; the reason is always in the error log:

```bash
sudo tail -n 50 /var/log/nginx/error.log
```

Match the log line to a fix below.

## Fix 1: `directory index of "..." is forbidden`

The URL points at a directory, nginx found no file from the `index` directive in it, and `autoindex` is off.

- Make sure the file exists: `ls -l /var/www/html/index.html`.
- Make sure the `index` directive includes it:

```nginx
server {
    root /var/www/html;
    index index.html index.htm index.php;
}
```

- For single-page apps, route everything to `index.html`:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

- If you really want a file listing, add `autoindex on;` to the location.

A common trap: `try_files $uri $uri/ =404;` with a missing index gives 403, not 404, because `$uri/` matches the directory.

## Fix 2: `(13: Permission denied)`

The nginx worker (user `www-data` on Debian/Ubuntu, `nginx` on RHEL/Fedora — see the `user` line in `nginx.conf`) must be able to **read** the file and **execute (traverse)** every directory above it.

Check the whole path at once:

```bash
namei -l /var/www/site/index.html
```

Fix permissions:

```bash
sudo chmod -R o+r /var/www/site
sudo find /var/www/site -type d -exec chmod o+x {} \;
```

Serving from a home directory is the classic case: `/home/alice` is `drwx------` or `drwxr-x---`, so nginx can't enter it. Either `chmod o+x /home/alice` (allows traversal only) or, better, move the site to `/var/www/` and give ownership to a deploy group.

Test as the nginx user:

```bash
sudo -u www-data cat /var/www/site/index.html
```

## Fix 3: SELinux (RHEL, CentOS, Fedora, Rocky, Alma)

If Unix permissions look fine but you still get `Permission denied`, SELinux is likely blocking it. Check:

```bash
getenforce
sudo ausearch -m avc -ts recent | grep nginx
ls -Z /var/www/site
```

Files must have the `httpd_sys_content_t` label:

```bash
sudo semanage fcontext -a -t httpd_sys_content_t "/srv/site(/.*)?"
sudo restorecon -Rv /srv/site
```

If nginx proxies to an upstream and gets 403/502 with SELinux, also: `sudo setsebool -P httpd_can_network_connect 1`.

## Fix 4: an access rule

`access forbidden by rule` in the log means an `allow`/`deny` directive matched:

```nginx
location /admin/ {
    allow 10.0.0.0/8;
    deny all;
}
```

Add your IP or remove the rule. Many configs also have `location ~ /\. { deny all; }`, which blocks dotfiles like `/.well-known/` — add an exception:

```nginx
location ^~ /.well-known/acme-challenge/ { allow all; }
```

## Fix 5: PHP / upstream returned 403

If the log is clean, the 403 may come from the backend (PHP-FPM `security.limit_extensions`, an app's auth). Check the upstream's logs, and that `fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;` points at a real file.

After any change:

```bash
sudo nginx -t && sudo systemctl reload nginx
```
