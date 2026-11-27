---
error: "upstream sent too big header while reading response header from upstream"
error_full: |
  [error] 1234#1234: *56 upstream sent too big header while reading response header from upstream, client: 203.0.113.5, server: example.com, request: "GET / HTTP/1.1", upstream: "http://127.0.0.1:3000/", host: "example.com"
cat: web
description: "The response headers from your backend (often large cookies or long redirect URLs) didn't fit in nginx's proxy buffer, so nginx returned 502 Bad Gateway. Increase the buffer sizes."
tldr: "Raise the header buffer in the location that proxies the request: `proxy_buffer_size 16k; proxy_buffers 8 16k; proxy_busy_buffers_size 32k;` (for PHP-FPM use `fastcgi_buffer_size 32k; fastcgi_buffers 16 16k;`), then `sudo nginx -t && sudo systemctl reload nginx`. Also check why the headers are so large (huge cookies)."
keywords: nginx upstream sent too big header while reading response header from upstream 502 bad gateway proxy_buffer_size proxy_buffers fastcgi_buffer_size php-fpm large cookies set-cookie
related: [web-nginx-502-bad-gateway, web-nginx-413-request-entity-too-large, web-nginx-upstream-timed-out-110-connection-timed-out]
---
## What it means

nginx reads the backend's status line and headers into a single buffer of size `proxy_buffer_size` (or `fastcgi_buffer_size` / `uwsgi_buffer_size`). The default is one memory page: 4k or 8k. If the headers are bigger, nginx gives up, logs this message in `error.log` and returns **502 Bad Gateway** to the client.

Typical triggers:

- Large `Set-Cookie` headers (session data stored in cookies, many auth cookies from OAuth/OpenID Connect, Keycloak, NextAuth)
- Long `Location` redirect URLs with big query strings
- Debug headers from frameworks (e.g. PHP debug bars, Laravel/Symfony profilers)
- Big CSP or `Link` headers

See the size of the headers directly from the backend:

```bash
curl -s -D - -o /dev/null http://127.0.0.1:3000/ | wc -c
```

## Fix 1: proxy_pass (Node, Python, Java, Go backends)

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;

    proxy_buffer_size        16k;
    proxy_buffers            8 16k;
    proxy_busy_buffers_size  32k;
}
```

`proxy_busy_buffers_size` must be at least as large as `proxy_buffer_size` and smaller than the total of `proxy_buffers` minus one buffer, or `nginx -t` fails with `"proxy_busy_buffers_size" must be less than the size of all "proxy_buffers" minus one buffer`.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Fix 2: PHP-FPM (fastcgi_pass)

The proxy directives don't apply to FastCGI. Use the fastcgi equivalents:

```nginx
location ~ \.php$ {
    include fastcgi_params;
    fastcgi_pass unix:/run/php/php8.3-fpm.sock;

    fastcgi_buffer_size       32k;
    fastcgi_buffers           16 16k;
    fastcgi_busy_buffers_size 32k;
}
```

For uWSGI use `uwsgi_buffer_size` / `uwsgi_buffers`.

## Fix 3: Kubernetes ingress-nginx

Set it per Ingress with an annotation:

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-buffer-size: "16k"
```

or globally with `proxy-buffer-size: "16k"` in the controller ConfigMap.

## Fix 4: shrink the headers

Bigger buffers treat the symptom. If headers are tens of kilobytes, the client will also hit limits (browsers cap cookie size at ~4 KB per cookie, and many servers reject requests with large `Cookie` headers). Store session data server-side and keep only a session ID in the cookie, and turn off debug headers in production.

## Related: request headers too large

If the problem is the *client's* request headers (big cookies sent to nginx), you instead get `400 Bad Request — Request Header Or Cookie Too Large`. That is controlled by `large_client_header_buffers 4 16k;` in the `server` or `http` block.
