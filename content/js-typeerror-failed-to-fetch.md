---
error: "TypeError: Failed to fetch"
error_full: |
  Uncaught (in promise) TypeError: Failed to fetch
      at fetchData (app.js:12:22)
  TypeError: NetworkError when attempting to fetch resource.   (Firefox)
  TypeError: Load failed                                        (Safari)
cat: javascript
description: "fetch() never got an HTTP response it was allowed to read. The usual causes are CORS, the server being down or unreachable, mixed content (HTTP from an HTTPS page), a wrong URL, or a browser extension blocking the request."
tldr: "Open DevTools → Console and Network: the real reason is printed next to the failed request. CORS → add `Access-Control-Allow-Origin` on the server (or proxy the API). `ERR_CONNECTION_REFUSED` → start the server / fix host and port. Mixed content → call the API over `https://`. Also disable ad blockers and check the URL scheme."
keywords: javascript typeerror failed to fetch fetch api networkerror when attempting to fetch resource load failed cors connection refused mixed content react localhost api ad blocker
related: [web-cors-no-access-control-allow-origin, web-err-connection-refused, web-mixed-content-blocked]
---
## What it means

`fetch()` rejects its promise with `TypeError` only on *network-level* failures. An HTTP 404 or 500 does **not** cause this — those resolve normally with `response.ok === false`. So "Failed to fetch" means the browser either couldn't reach the server, or got a response but refused to give it to your script.

The message itself is deliberately vague for security. The details are in DevTools:

- **Console**: look for a red line just before the TypeError (CORS, mixed content, CSP).
- **Network tab**: the request's status column shows `(failed)`, `CORS error`, `net::ERR_CONNECTION_REFUSED`, `(blocked:mixed-content)` etc.

## Cause 1: CORS

Console shows: `has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present`. The server must allow your page's origin:

```js
// Express
import cors from "cors";
app.use(cors({ origin: "http://localhost:5173" }));
```

Requests with JSON bodies or custom headers send a preflight `OPTIONS` request first; the server must answer it with 2xx and the `Access-Control-Allow-*` headers. `mode: "no-cors"` does **not** fix this — it gives you an empty, unreadable response. During development, a dev-server proxy avoids CORS completely:

```js
// vite.config.js
export default { server: { proxy: { "/api": "http://localhost:3000" } } };
```

Then call `fetch("/api/items")`. Full guide: [CORS No 'Access-Control-Allow-Origin'](/web/web-cors-no-access-control-allow-origin/).

## Cause 2: server not running or wrong host/port

Network tab shows `net::ERR_CONNECTION_REFUSED` or `ERR_NAME_NOT_RESOLVED`. Check the API is up:

```bash
curl -i http://localhost:3000/api/items
```

Common mistakes: wrong port, `localhost` in a URL used from a phone or another container, server bound only to `127.0.0.1`, or an env var like `VITE_API_URL` undefined (producing `undefined/api/items`). Log the URL you're fetching.

## Cause 3: mixed content

An `https://` page can't fetch `http://` URLs. Console shows `Mixed Content: ... was loaded over HTTPS, but requested an insecure resource`. Serve the API over HTTPS, or use a relative URL. See [mixed content blocked](/web/web-mixed-content-blocked/).

## Cause 4: invalid or self-signed certificate

`net::ERR_CERT_AUTHORITY_INVALID` on an HTTPS API (e.g. a local dev server with a self-signed cert). Open the API URL directly in the browser and accept it for dev, or use a trusted local cert (mkcert).

## Cause 5: browser extensions, CSP, or firewalls

Ad blockers and privacy extensions block URLs containing words like `analytics`, `track`, `ads` (`net::ERR_BLOCKED_BY_CLIENT`). Test in a private window without extensions. A Content Security Policy `connect-src` directive can also block the request — the console says so explicitly.

## Cause 6: request aborted or page navigated away

A form `submit` that reloads the page cancels in-flight fetches. Call `event.preventDefault()` in the submit handler. Timeouts via `AbortController` reject with `AbortError`, not this TypeError.

## Handle it in code

```js
try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
} catch (err) {
  console.error("Request failed:", url, err);
}
```

In Node.js 18+, the same failure appears as `TypeError: fetch failed` with the real reason in `err.cause` (e.g. `ECONNREFUSED`).
