---
error: "499 Client Closed Request"
error_full: |
  192.0.2.10 - - [21/Nov/2026:10:15:42 +0000] "POST /api/report HTTP/1.1" 499 0 "-" "Mozilla/5.0 ..."
cat: web
description: "499 is an nginx-only log status: the client closed the connection before nginx sent a response. Usually the upstream (app server) was too slow and the client, a load balancer or a proxy in front gave up first."
tldr: "Find what's slow: add `$request_time $upstream_response_time` to the nginx log format. Speed up or make async the slow endpoint, and align timeouts so the client/load balancer waits at least as long as nginx (`proxy_read_timeout`). If nginx is behind another proxy or LB, raise that proxy's idle timeout. Use `proxy_ignore_client_abort on;` only if the upstream must finish."
keywords: nginx 499 client closed request status code log upstream slow timeout proxy_read_timeout proxy_ignore_client_abort load balancer aws alb idle timeout request_time upstream_response_time
related: [web-504-gateway-timeout, web-nginx-502-bad-gateway, node-error-socket-hang-up-econnreset]
---
## What it means

`499` is not a real HTTP status sent to anyone. nginx writes it to `access.log` when the client disconnected while nginx was still waiting to send the response. The browser or caller never sees 499; it sees a cancelled request, a timeout, or whatever the proxy in front of nginx returned (often 504).

A few 499s are normal (users closing tabs, navigating away, mobile networks). Many 499s on the same endpoint mean that endpoint is too slow for someone in the chain.

The [HTTP status codes reference](/tools/http-status-codes/) lists the related 502/504 codes.

## Step 1: measure

Add timing to the log format in the `http` block:

```nginx
log_format timed '$remote_addr "$request" $status '
                 'rt=$request_time urt=$upstream_response_time '
                 'ua="$http_user_agent"';
access_log /var/log/nginx/access.log timed;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
awk '$0 ~ / 499 /' /var/log/nginx/access.log | tail
```

If every 499 has `rt` close to the same number (e.g. 30.0 or 60.0), something upstream of nginx (client or proxy) has that timeout.

## Cause 1: slow upstream application

The backend (Node, PHP-FPM, Gunicorn, Spring) takes longer than the client is willing to wait. Fix the cause: slow database queries, external API calls, missing indexes, too few workers. For long jobs (exports, reports, AI calls), return `202 Accepted` with a job ID and let the client poll, or stream progress.

## Cause 2: load balancer or CDN timeout in front of nginx

Cloud load balancers close idle connections: AWS ALB defaults to 60 s, Cloudflare to 100 s, GCP's to 30 s backend timeout. When they give up, nginx logs 499. Raise the LB timeout to more than your slowest legitimate request, and keep nginx's own timeouts consistent:

```nginx
location /api/ {
    proxy_pass http://app;
    proxy_connect_timeout 5s;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
}
```

## Cause 3: client-side timeouts and cancellations

HTTP clients with short timeouts (axios `timeout`, `fetch` with `AbortController`, curl `--max-time`, health checks with 1–5 s limits) abort and nginx logs 499. Single-page apps also cancel in-flight requests on navigation or search-as-you-type. Increase the client timeout, or debounce requests. For Kubernetes probes, raise `timeoutSeconds`.

## Cause 4: health checks hitting a slow route

If 499s come from the LB's user agent (`ELB-HealthChecker`, `kube-probe`), point the health check at a lightweight endpoint that doesn't touch the database.

## Optional: let the upstream finish anyway

By default nginx closes the upstream connection when the client leaves, which can interrupt work. To keep it running:

```nginx
proxy_ignore_client_abort on;
# for PHP-FPM / FastCGI
fastcgi_ignore_client_abort on;
```

This hides the symptom only; the request is still slow. Make non-idempotent operations (payments, emails) safe to retry either way.
