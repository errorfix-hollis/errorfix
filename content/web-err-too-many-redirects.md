---
error: "ERR_TOO_MANY_REDIRECTS"
error_full: |
  This page isn't working
  example.com redirected you too many times.
  ERR_TOO_MANY_REDIRECTS
cat: web
description: The browser followed a redirect loop (A → B → A …). Usually an HTTP↔HTTPS loop behind Cloudflare or a load balancer, a www/non-www rule conflict, or an app that keeps redirecting to login.
tldr: "Trace the loop: `curl -sIL https://example.com | grep -i '^location'`. Behind Cloudflare, set SSL mode to Full (strict) instead of Flexible. Behind a proxy, make the app trust `X-Forwarded-Proto` so it knows the request is already HTTPS."
keywords: err_too_many_redirects redirected you too many times redirect loop cloudflare flexible ssl nginx https www wordpress x-forwarded-proto
related: [web-nginx-502-bad-gateway, web-cors-no-access-control-allow-origin]
---
## What it means

Browsers give up after ~20 redirects. Some rule sends the request back to a URL that redirects again.

First, clear cookies for the site (a bad cookie can cause login loops) and see the chain:

```bash
curl -sIL https://example.com | grep -iE '^(HTTP|location)'
```

## Cause 1: Cloudflare "Flexible" SSL + origin forcing HTTPS

With Flexible, Cloudflare talks to your server over **HTTP**. Your server redirects to HTTPS, Cloudflare fetches HTTP again… forever.

Fix: install a certificate on the origin (Let's Encrypt or a Cloudflare Origin Certificate) and set **SSL/TLS → Full (strict)**. Load balancers like AWS ALB doing TLS termination cause the same loop.

## Cause 2: the app doesn't know it's behind HTTPS

A reverse proxy terminates TLS and forwards plain HTTP. The app sees HTTP and redirects to HTTPS. Pass and trust the forwarded protocol:

nginx:

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

Then in the app: Django `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")`, Express `app.set("trust proxy", 1)`, Laravel `TrustProxies` middleware, Rails `config.assume_ssl = true`.

## Cause 3: www and non-www rules fighting

One rule redirects `example.com → www.example.com` and another (DNS provider, CDN, app setting) does the reverse. Choose one canonical host and remove the other rule.

WordPress: `siteurl` and `home` (Settings → General or `wp_options`) must match your real canonical URL, including `https://` and `www`.

## Cause 4: nginx config loops

```nginx
server {
    listen 443 ssl;
    return 301 https://$host$request_uri;   # redirects HTTPS to itself
}
```

Only put the redirect in the `listen 80` server block.

## Cause 5: auth redirect loops

A login page that itself requires login, or a session cookie that never sticks (wrong `domain`, `Secure` cookie on HTTP, `SameSite` issues) makes the app redirect to `/login` forever. Exclude the login route from the auth check and inspect the `Set-Cookie` header.
