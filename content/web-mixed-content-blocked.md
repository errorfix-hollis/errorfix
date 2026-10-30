---
error: "Mixed Content: The page was loaded over HTTPS, but requested an insecure resource. This request has been blocked."
error_full: |
  Mixed Content: The page at 'https://example.com/' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://api.example.com/data'. This request has been blocked; the content must be served over HTTPS.
  Mixed Content: The page at 'https://example.com/' was loaded over HTTPS, but requested an insecure script 'http://cdn.example.com/lib.js'. This request has been blocked; the content must be served over HTTPS.
cat: web
description: An HTTPS page tried to load a script, stylesheet, iframe, fetch/XHR call or other resource over plain HTTP, and the browser blocked it. Load every resource over HTTPS, usually by fixing hard-coded http:// URLs or a backend that generates them behind a TLS proxy.
tldr: "Change the URL to `https://` (or a relative path like `/api/data`) and make sure that host actually serves HTTPS. If your app generates `http://` links behind a reverse proxy, forward `X-Forwarded-Proto` and enable proxy trust in your framework. As a stopgap, add the header `Content-Security-Policy: upgrade-insecure-requests`."
keywords: mixed content the page was loaded over https but requested an insecure resource this request has been blocked content must be served over https xmlhttprequest fetch upgrade-insecure-requests x-forwarded-proto reverse proxy
related: [web-cors-no-access-control-allow-origin, web-err-too-many-redirects, web-net-err-cert-authority-invalid]
---
## What it means

A page served over HTTPS must not pull in content over unencrypted HTTP, because an attacker on the network could modify that content and, through it, the secure page. Browsers block "active" mixed content (scripts, stylesheets, iframes, `fetch`/XHR, WebSockets via `ws://`) outright. Modern Chrome and Firefox also auto-upgrade images, audio and video to HTTPS and block them if the upgrade fails.

The console message names the exact insecure URL. Find every one: DevTools → Console (filter "Mixed Content"), or the Network tab, or search your code and built output:

```bash
grep -rn "http://" src/ public/ --include=*.{html,js,jsx,ts,tsx,css}
```

## Fix 1: use https:// or relative URLs

```html
<!-- Wrong -->
<script src="http://cdn.example.com/lib.js"></script>

<!-- Right -->
<script src="https://cdn.example.com/lib.js"></script>
<!-- Same-origin: just use a path -->
<link rel="stylesheet" href="/css/site.css">
```

The target host must actually support HTTPS; if it doesn't, host the file yourself or find an HTTPS alternative.

## Fix 2: API base URL in environment config

Front-end builds often bake in the API URL. A `http://` value from local development ends up in production:

```bash
# .env.production
VITE_API_URL=https://api.example.com
# or NEXT_PUBLIC_API_URL / REACT_APP_API_URL depending on the framework
```

Rebuild after changing it — these values are inlined at build time. Use `wss://` instead of `ws://` for WebSockets.

## Fix 3: the backend generates http:// URLs behind a proxy

When TLS terminates at a load balancer, nginx, Cloudflare or a PaaS router, your app receives plain HTTP and builds absolute URLs (redirects, asset links, pagination `next` links, OAuth callbacks) with `http://`. Forward the original scheme and tell the framework to trust it.

nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Then, in the app:

- **Express:** `app.set('trust proxy', 1);`
- **Django:** `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')`
- **Flask:** wrap with `werkzeug.middleware.proxy_fix.ProxyFix(app.wsgi_app, x_proto=1)`
- **Laravel:** configure trusted proxies (`TrustProxies` middleware), or `URL::forceScheme('https')` in production.
- **Spring Boot:** `server.forward-headers-strategy=framework`

Trailing-slash redirects are a classic case: `/api/items` → `301 http://example.com/api/items/` gets blocked.

## Fix 4: CMS with an http:// site URL (WordPress)

If the site was moved to HTTPS, the stored site URL and old post content still contain `http://`. Set both **WordPress Address** and **Site Address** to `https://` in *Settings → General*, then replace old URLs in the database, e.g. with WP-CLI:

```bash
wp search-replace 'http://example.com' 'https://example.com' --skip-columns=guid --dry-run
wp search-replace 'http://example.com' 'https://example.com' --skip-columns=guid
```

## Stopgap: upgrade-insecure-requests

This header makes the browser rewrite `http://` subresource URLs to `https://` before requesting them:

```nginx
add_header Content-Security-Policy "upgrade-insecure-requests" always;
```

or in HTML:

```html
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
```

It only works if every affected host serves the same resource over HTTPS, and it doesn't fix your code — keep fixing the source URLs.
