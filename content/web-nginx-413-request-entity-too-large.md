---
error: "413 Request Entity Too Large (nginx)"
cat: web
description: The upload is bigger than nginx allows (1 MB by default). Raise client_max_body_size, and the limit in your app or PHP too.
tldr: "Add `client_max_body_size 50M;` to the `http`, `server` or `location` block, then `sudo nginx -t && sudo systemctl reload nginx`. For PHP also raise `upload_max_filesize` and `post_max_size`."
keywords: 413 request entity too large nginx client_max_body_size upload file size wordpress php upload_max_filesize
related: [web-nginx-502-bad-gateway]
---
## What it means

nginx rejects request bodies larger than `client_max_body_size`, which defaults to **1 MB**. Any upload bigger than that gets a 413 before it reaches your app.

## Fix in nginx

```nginx
server {
    client_max_body_size 50M;
    ...
}
```

You can put it in `http { }` (all sites), `server { }` (one site) or `location { }` (one path). Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

`0` disables the check entirely. Usually not a good idea on public servers.

## PHP / WordPress: raise PHP's limits too

In `php.ini` (find it with `php --ini`, or the FPM one in `/etc/php/*/fpm/php.ini`):

```ini
upload_max_filesize = 50M
post_max_size = 55M
```

Then `sudo systemctl restart php8.3-fpm`. When PHP's limit is hit, WordPress shows "The uploaded file exceeds the upload_max_filesize directive" instead of a 413.

## Other layers with their own limits

- **Node/Express:** `express.json({ limit: '10mb' })`; multer has `limits.fileSize`.
- **Django:** `DATA_UPLOAD_MAX_MEMORY_SIZE`.
- **Kubernetes ingress-nginx:** annotation `nginx.ingress.kubernetes.io/proxy-body-size: 50m`.
- **Cloudflare:** the free plan caps proxied request bodies at 100 MB (larger plans allow more).
- **Apache:** `LimitRequestBody`.
