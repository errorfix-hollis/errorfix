---
error: "SyntaxError: Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"
error_full: |
  Uncaught (in promise) SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
cat: javascript
description: You called response.json() but the server returned HTML (an error page, a 404, or your app's index.html). Check the URL and the response status.
tldr: "Open the request in DevTools → Network and look at the response: it's HTML, not JSON. Usually the API URL is wrong (404 → index.html), the server crashed (500 page), or you need to log in. Check `res.ok` before calling `res.json()`."
keywords: unexpected token < in json at position 0 doctype is not valid json fetch response.json api returns html
related: [js-cannot-read-properties-of-undefined, web-cors-no-access-control-allow-origin]
---
## What it means

`JSON.parse` (which `response.json()` uses) got text starting with `<`. JSON never starts with `<`, but HTML does: `<!DOCTYPE html>`. So the server sent a web page instead of JSON.

## Find out what came back

DevTools → **Network** → click the request → **Response**. Or log it:

```js
const res = await fetch('/api/items');
const text = await res.text();
console.log(res.status, text.slice(0, 300));
```

## Common causes

**1. Wrong URL, and a single-page app fallback serves `index.html`.** Dev servers (Vite, CRA) and hosts like Netlify/Vercel return `index.html` for unknown paths, with status 200. Check the path, a missing `/api` prefix, or a missing dev-server proxy setting.

**2. The API crashed** and returned an HTML error page (500, 502 Bad Gateway).

**3. Not logged in**: you got redirected to an HTML login page.

**4. Relative URL resolved differently**: `fetch('api/items')` on `/dashboard/` requests `/dashboard/api/items`. Use a leading slash: `fetch('/api/items')`.

## Make your code fail clearly

```js
const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
const type = res.headers.get('content-type') || '';
if (!type.includes('application/json')) throw new Error(`Expected JSON, got ${type}`);
const data = await res.json();
```

## Other "Unexpected token" variants

- `Unexpected token u in JSON at position 0` — you parsed `undefined` (e.g. `JSON.parse(localStorage.getItem('missing'))`, which is actually `null`… or an undefined variable). Check the value before parsing.
- `Unexpected end of JSON input` — the response body was empty (e.g. a 204 response). Don't call `.json()` on empty responses.
- `Unexpected token o in JSON` — you parsed something that is already an object (`"[object Object]"`). Skip `JSON.parse`.
