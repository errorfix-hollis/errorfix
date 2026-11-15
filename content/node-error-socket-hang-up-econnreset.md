---
error: "Error: socket hang up (ECONNRESET)"
error_full: |
  Error: socket hang up
      at connResetException (node:internal/errors:787:14)
      at TLSSocket.socketOnEnd (node:_http_client:519:23)
      at TLSSocket.emit (node:events:530:35) {
    code: 'ECONNRESET'
  }

  Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:218:20) {
    errno: -104,
    code: 'ECONNRESET',
    syscall: 'read'
  }
cat: npm
description: "The other side (server, proxy or load balancer) closed the TCP connection before Node got a complete response. Common causes are reused keep-alive sockets the server already closed, timeouts, HTTP/HTTPS or TLS mismatches, and crashing servers."
tldr: "Retry idempotent requests once on ECONNRESET. On your Node server set `server.keepAliveTimeout` above the load balancer's idle timeout (e.g. 65000 with a 60s ALB) and `server.headersTimeout` higher still. Check you use `https://` for TLS ports, and look at the server/proxy logs for crashes or timeouts at the same moment."
keywords: node error socket hang up econnreset read econnreset keepalivetimeout headerstimeout axios fetch undici load balancer proxy retry keep-alive agent
related: [node-typeerror-fetch-failed, node-error-listen-eaddrinuse-address-already-in-use, web-504-gateway-timeout]
---
## What it means

`ECONNRESET` means the peer reset the connection with a TCP RST. `socket hang up` is Node's message when the socket ended before a response arrived. To your code both mean the same: the request may or may not have reached the server, and there's no response.

Find out **which side** you are on:

- **Client** (`http.request`, axios, got, `fetch` with `cause: ECONNRESET`): the server or something in between closed the connection.
- **Server** (`'clientError'` events, `aborted` requests): the browser or client went away. That's usually harmless, but don't crash on it.

## Cause 1: keep-alive race (intermittent, after idle periods)

Clients reuse idle keep-alive sockets. If the server closes an idle socket at the same moment the client sends a new request on it, you get `ECONNRESET`. Node 19+ enables keep-alive by default in the global agent, and `fetch` (undici) always pools connections, so this got more common.

Client-side fixes:

```js
// retry idempotent requests once
async function getWithRetry(url, tries = 2) {
  try { return await fetch(url); }
  catch (e) {
    if (tries > 1 && e.cause?.code === 'ECONNRESET') return getWithRetry(url, tries - 1);
    throw e;
  }
}
```

With `http.Agent` you can make the client drop idle sockets *before* the server does: `new http.Agent({ keepAlive: true, timeout: 4000 })`. Keep it shorter than the server's keep-alive timeout. axios users can add `axios-retry`.

## Cause 2: Node server behind a load balancer

Node's `server.keepAliveTimeout` defaults to **5 seconds**. AWS ALB, GCP and nginx keep upstream connections longer (ALB: 60s). The proxy reuses a connection that Node already closed, so clients see 502 and the proxy logs a reset. Make Node wait longer than the proxy:

```js
const server = app.listen(3000);
server.keepAliveTimeout = 65_000;   // > LB idle timeout (60s)
server.headersTimeout   = 66_000;   // must be > keepAliveTimeout
```

## Cause 3: the server timed out or crashed

Long requests can be killed by a timeout anywhere along the path: Node's `server.requestTimeout` (300s default since Node 18), an nginx `proxy_read_timeout` (60s), a cloud LB, or the upstream app. A process crash or OOM kill mid-request also resets the socket. Check the server logs and `dmesg` at the exact time. For long jobs, return `202 Accepted` and poll, or stream progress. See [504 Gateway Timeout](/web/web-504-gateway-timeout/).

## Cause 4: protocol mismatch

- Sending plain `http://` to a TLS port (443, 8443): the server resets the connection. Use `https://`.
- TLS problems: an old server that only supports TLS 1.0/1.1, a missing SNI `servername` when connecting by IP, or a corporate proxy intercepting TLS. Test with `curl -v https://host/` and `openssl s_client -connect host:443 -servername host`.
- An HTTP proxy required by your network but not configured (`HTTPS_PROXY`). Node's `fetch` ignores proxy env vars unless you configure undici's `EnvHttpProxyAgent` or run Node 24+ with `NODE_USE_ENV_PROXY=1`.

## Cause 5: the server rejects the request

Some servers and WAFs reset instead of returning 4xx: request bodies over the size limit, missing `Content-Length`, a blocked `User-Agent`, rate limits, or too many concurrent connections from one IP. Throttle concurrency (e.g. `p-limit`) and compare with a `curl` request.

## Server side: don't crash on client resets

An unhandled `'error'` on a socket or stream crashes the process with `Error: read ECONNRESET`. Handle it:

```js
req.on('error', (err) => { if (err.code !== 'ECONNRESET') console.error(err); });
server.on('clientError', (err, socket) => socket.destroy());
```

With `stream.pipeline()` errors are forwarded to the callback instead of being thrown.
