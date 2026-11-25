---
error: "net::ERR_HTTP2_PROTOCOL_ERROR"
error_full: |
  This site can't be reached
  The webpage at https://example.com/ might be temporarily down or it may have moved permanently to a new web address.
  ERR_HTTP2_PROTOCOL_ERROR

  GET https://example.com/api/data net::ERR_HTTP2_PROTOCOL_ERROR 200 (OK)
cat: web
description: "Chrome received an HTTP/2 stream that broke the protocol, so it dropped the response. Usually the server or a proxy reset the stream mid-response: invalid response headers, a backend that crashed while streaming, a full disk/buffer on nginx, or a proxy/antivirus mangling HTTP/2."
tldr: "Site owners: check the server/proxy error log at the time of the request. Common fixes: remove invalid headers (uppercase/duplicate `Connection`, `Transfer-Encoding`, header values with newlines), free disk space so nginx can buffer (`/var/lib/nginx`), raise `proxy_buffers`/timeouts, fix wrong `Content-Length`. Test with `curl -v --http2 https://site/`. Visitors: try incognito, disable extensions/antivirus HTTPS scanning, clear site data."
keywords: chrome net::err_http2_protocol_error 200 ok http2 stream reset nginx cloudflare content-length transfer-encoding connection header antivirus incognito curl --http2 proxy_buffering disk full
related: [web-err-connection-reset, web-504-gateway-timeout, web-nginx-502-bad-gateway]
---
## What it means

HTTP/2 multiplexes many requests over one connection as *streams*. If the server sends something the HTTP/2 spec forbids, or abruptly resets the stream with `RST_STREAM` / `GOAWAY` (`PROTOCOL_ERROR` or `INTERNAL_ERROR`), Chrome shows `ERR_HTTP2_PROTOCOL_ERROR`. Firefox shows a blank page or `NS_ERROR_NET_INTERRUPT`/`NS_ERROR_NET_RESET`.

The `200 (OK)` in DevTools is misleading: the status line arrived, then the body broke.

Reproduce outside the browser:

```bash
curl -v --http2 -o /dev/null https://example.com/api/data
# look for: "HTTP/2 stream 1 was not closed cleanly: PROTOCOL_ERROR"
curl -v --http1.1 -o /dev/null https://example.com/api/data   # does HTTP/1.1 work?
```

If HTTP/1.1 works and HTTP/2 fails, it's a server-side HTTP/2 problem.

## Cause 1: invalid response headers

HTTP/2 forbids connection-specific headers and requires valid header values. Problems include:

- `Connection: keep-alive`, `Keep-Alive`, `Upgrade`, `Transfer-Encoding: chunked` set by app code (nginx strips most, but some proxies/servers forward them).
- Header values containing `\r`/`\n` or other control characters (e.g. a filename or user input in `Content-Disposition`).
- Very large headers or cookies exceeding the client's limits.

Remove or sanitize those headers in your app. Encode filenames with `filename*=UTF-8''...`.

## Cause 2: wrong Content-Length

If the app sends `Content-Length: 5000` and then fewer or more bytes (gzip applied after setting length, middleware modifying the body), the stream is invalid. Let the server compute the length, or drop the header when compressing.

## Cause 3: backend died mid-response

The upstream (Node, PHP-FPM, Gunicorn) crashed, timed out or was OOM-killed while streaming. nginx can't change the already-sent `200`, so it resets the stream. Check:

```bash
sudo tail -f /var/log/nginx/error.log
# "upstream prematurely closed connection while reading upstream"
journalctl -u myapp --since "10 min ago"
```

Fix the backend error, or raise timeouts for slow endpoints:

```nginx
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

## Cause 4: nginx can't buffer the response (disk full / permissions)

Large responses are buffered to `/var/lib/nginx/proxy` (or `/var/cache/nginx`). If that disk is full or not writable you'll see `pwrite() ... failed (28: No space left on device)` or `Permission denied` in the error log, and big files fail with this error.

```bash
df -h /var/lib/nginx
sudo chown -R www-data:www-data /var/lib/nginx    # user from nginx.conf
```

Or disable buffering for streaming endpoints: `proxy_buffering off;`.

## Cause 5: CDN / proxy / load balancer

Cloudflare, AWS ALB and others terminate HTTP/2 and talk to your origin separately. Check the origin directly (`curl --resolve example.com:443:ORIGIN_IP ...`). Disabling HTTP/2 to origin, or fixing origin headers, usually solves it.

## Cause 6 (visitors): something on your machine

If many sites fail only in your browser:

- Try an incognito window (rules out extensions and cached data).
- Disable antivirus HTTPS/web scanning, VPN or a corporate proxy temporarily.
- Clear site data: DevTools → *Application → Storage → Clear site data*.
- Update Chrome; check the system clock is correct.
