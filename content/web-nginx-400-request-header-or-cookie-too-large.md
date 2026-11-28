---
error: "400 Bad Request: Request Header Or Cookie Too Large"
error_full: |
  400 Bad Request
  Request Header Or Cookie Too Large
  nginx
cat: web
description: "A single request header (almost always the Cookie header, sometimes a big Authorization/JWT header) is bigger than nginx's header buffer, so nginx rejects the request. Users fix it by clearing cookies; servers fix it by shrinking cookies or raising large_client_header_buffers."
tldr: "As a user: clear cookies for that site (or try a private window). As the server owner: raise the limit in the `http` or `server` block, e.g. `large_client_header_buffers 4 32k;`, then `sudo nginx -t && sudo systemctl reload nginx`. Long term, stop storing large data in cookies."
keywords: nginx 400 bad request request header or cookie too large large_client_header_buffers cookie size jwt authorization header clear cookies http2 414 request-uri too large
related: [web-nginx-upstream-sent-too-big-header, web-nginx-413-request-entity-too-large, web-nginx-502-bad-gateway]
---
## What it means

nginx reads request headers into buffers. Each header line, and the request line, must fit into one buffer defined by `large_client_header_buffers` (default `4 8k`: up to 4 buffers of 8 KB). If one header line, usually `Cookie:`, is larger than 8 KB, nginx returns `400 Request Header Or Cookie Too Large`. (If the request URL itself is too long, the same directive produces `414 Request-URI Too Large`.)

Cookies grow because every cookie for the domain, including those set by analytics, A/B testing, or auth libraries that store whole sessions or tokens, is sent with every request.

## Fix 1 (users): clear cookies for the site

- Chrome/Edge: click the icon left of the address bar → Site settings / Cookies → delete for that site.
- Firefox: padlock icon → Clear cookies and site data.
- Quick test: open the site in a private/incognito window. If it works there, cookies are the cause.

## Fix 2 (server): raise the buffer size

In `nginx.conf` (`http` block) or the site's `server` block:

```nginx
http {
    large_client_header_buffers 4 32k;
}
```

Test and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Notes:

- The size applies per header line; the number is how many such buffers a connection can use. `4 16k` or `4 32k` is usually plenty.
- Setting it inside a `server` block works for the default server on that address/port; if it seems ignored, put it in `http`.
- On older nginx versions with HTTP/2, header limits were controlled by `http2_max_field_size` / `http2_max_header_size`. Those directives are obsolete in current nginx, where `large_client_header_buffers` covers HTTP/2 as well.

## Fix 3: also raise limits behind nginx

If nginx is a reverse proxy, the backend may have its own limit and fail next with its own error:

- Node.js: default max header size is 16 KB; raise with `node --max-http-header-size=32768 server.js`.
- Tomcat/Spring Boot: `server.max-http-request-header-size=32KB` (older Boot versions: `server.max-http-header-size`).
- Load balancers and CDNs in front of nginx have fixed limits you may not be able to change, so Fix 4 matters.

The response-side counterpart (`upstream sent too big header`) is a different setting, `proxy_buffer_size`; see the related page.

## Fix 4: make the cookies smaller

Raising limits only postpones the problem. Find what's large in the browser dev tools (Application → Cookies, Size column) or log it:

```nginx
log_format cookies '$remote_addr "$http_cookie"';
```

Typical culprits and fixes:

- **Session data stored in a cookie** (client-side sessions, big JWTs with many claims): store a session ID in the cookie and the data server-side.
- **Many subdomain apps sharing a parent-domain cookie scope** (`Domain=.example.com`): scope cookies to the host that needs them.
- **Chunked auth cookies** that keep multiplying (e.g. `.AspNetCore.Cookies` chunks, OIDC state cookies left over from failed logins): clean up stale cookies on login and reduce claims in the token.
