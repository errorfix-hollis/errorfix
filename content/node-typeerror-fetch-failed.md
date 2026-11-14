---
error: "TypeError: fetch failed"
error_full: |
  TypeError: fetch failed
      at node:internal/deps/undici/undici:13502:13
      at async main (/app/index.js:3:15) {
    [cause]: Error: connect ECONNREFUSED 127.0.0.1:3000
        at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1607:16) {
      errno: -111,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000
    }
  }
cat: npm
description: "Node's built-in fetch (undici) couldn't complete the request at the network level. The real reason is in the error's cause: ECONNREFUSED, ENOTFOUND, a timeout, a TLS certificate error, or localhost resolving to IPv6."
tldr: "Log the cause: `catch (e) { console.error(e.cause) }`. ECONNREFUSED on localhost: use `http://127.0.0.1:PORT` instead of `localhost` (Node 17+ may resolve it to ::1). ENOTFOUND: fix the hostname/DNS. Certificate errors: set `NODE_EXTRA_CA_CERTS=/path/ca.pem`. Behind a proxy, use undici's ProxyAgent (`setGlobalDispatcher(new ProxyAgent(url))`)."
keywords: node typeerror fetch failed undici cause econnrefused enotfound und_err_connect_timeout localhost ipv6 ::1 127.0.0.1 next.js proxy node_extra_ca_certs self signed
related: [js-typeerror-failed-to-fetch, node-unable-to-get-issuer-cert-locally, web-err-connection-refused]
---
## What it means

Since Node 18, `fetch()` is built in (implemented by undici). When the request fails *before* any HTTP response arrives, it rejects with a generic `TypeError: fetch failed`. HTTP errors like 404 or 500 do **not** cause this; they resolve normally with `res.ok === false`.

The useful information is in `error.cause`, which many loggers and frameworks (Next.js, Remix, Nuxt) hide. Print it:

```js
try {
  const res = await fetch(url);
} catch (err) {
  console.error(err.cause ?? err);
}
```

Then match the cause code below.

## Cause 1: `ECONNREFUSED` — nothing listening, or `localhost` → IPv6

Node 17+ no longer reorders DNS results to prefer IPv4, so `localhost` can resolve to `::1`. If your API only listens on `127.0.0.1`, the connection is refused:

```
[cause]: Error: connect ECONNREFUSED ::1:3000
```

Fixes:

```js
await fetch("http://127.0.0.1:3000/api");     // explicit IPv4
```

or make the server listen on all interfaces (`app.listen(3000, "0.0.0.0")` or `"::"`), or run Node with `--dns-result-order=ipv4first`.

If the address is IPv4 and still refused, the server isn't running on that port. Check with `curl -v http://127.0.0.1:3000` or `ss -ltnp | grep 3000`.

**In Docker**, `localhost` is the container itself. Call the other service by its Compose service name (`http://api:3000`), or `host.docker.internal` to reach the host.

## Cause 2: `ENOTFOUND` / `EAI_AGAIN` — DNS lookup failed

```
[cause]: Error: getaddrinfo ENOTFOUND api.exmaple.com
```

Check for typos and that the URL has a scheme (`https://`). Then test DNS from the same machine: `nslookup api.example.com`. `EAI_AGAIN` is a temporary DNS failure; see [Temporary failure in name resolution](/linux/linux-temporary-failure-in-name-resolution/).

## Cause 3: `UND_ERR_CONNECT_TIMEOUT` / `UND_ERR_HEADERS_TIMEOUT`

undici's default connect timeout is 10 s and headers/body timeouts are 300 s. A firewall dropping packets, or an IPv6 route that doesn't work, produces a connect timeout. Node 20+ tries addresses in turn ("happy eyeballs", `autoSelectFamily`); on older versions try `--dns-result-order=ipv4first`.

Set your own timeout to fail fast:

```js
await fetch(url, { signal: AbortSignal.timeout(5000) });
```

## Cause 4: TLS certificate errors

```
[cause]: Error: unable to get local issuer certificate
  code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'
```

Common behind corporate proxies that re-sign HTTPS. Give Node the company CA:

```bash
export NODE_EXTRA_CA_CERTS=/path/to/corp-ca.pem
node app.js
```

Other codes: `SELF_SIGNED_CERT_IN_CHAIN`, `CERT_HAS_EXPIRED`, `ERR_TLS_CERT_ALTNAME_INVALID`. See [unable to get local issuer certificate](/npm/node-unable-to-get-issuer-cert-locally/). Avoid `NODE_TLS_REJECT_UNAUTHORIZED=0` outside quick local tests.

## Cause 5: an HTTP proxy is required

Built-in fetch ignores `HTTP_PROXY`/`HTTPS_PROXY` by default. Use undici's proxy agent:

```js
import { setGlobalDispatcher, ProxyAgent } from "undici";
setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY));
```

Newer Node versions (24+, and 22.21+) honour the variables when started with `NODE_USE_ENV_PROXY=1`.

## Cause 6: `other side closed` / `ECONNRESET`

`[cause]: SocketError: other side closed` means the server or a load balancer closed the connection, often a keep-alive socket that timed out on the server side. Retry idempotent requests, or check the server's logs and keep-alive timeout.

## Next.js and server components

During `next build`, server-side `fetch` to your own API route (`http://localhost:3000/api/...`) fails because no server is running at build time. Call the data function directly instead of fetching your own API, or make the page dynamic.
