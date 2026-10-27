---
error: "has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource"
error_full: |
  Access to fetch at 'https://api.example.com/data' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled.
cat: web
description: The browser blocked a cross-origin request because the server didn't allow your origin. Fix it on the server (add CORS headers) or proxy the request through your own backend.
tldr: "The **server** must send `Access-Control-Allow-Origin: http://localhost:3000` (your origin). If you don't control the server, call it from your backend or a dev-server proxy instead of the browser. `mode: 'no-cors'` will not give you the data."
keywords: cors policy no access-control-allow-origin header blocked fetch axios localhost preflight express flask django
related: [js-unexpected-token-in-json]
---
## What it means

Browsers block JavaScript from reading responses from a **different origin** (scheme + host + port) unless that server explicitly allows it with CORS headers. `localhost:3000` → `localhost:8000` counts as a different origin too.

The request often *did* reach the server; the browser just refuses to hand the response to your code. That's why it works in Postman or curl but not in the browser.

## Fix on the server

The response must include your origin:

```http
Access-Control-Allow-Origin: http://localhost:3000
```

**Express:**

```js
import cors from 'cors';
app.use(cors({ origin: ['http://localhost:3000', 'https://myapp.com'] }));
```

**Flask:** `pip install flask-cors`, then `CORS(app, origins=["http://localhost:3000"])`.

**FastAPI:**

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])
```

**Django:** `django-cors-headers` with `CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]`.

**nginx:** `add_header Access-Control-Allow-Origin "https://myapp.com" always;`

## Preflight requests

Requests with JSON bodies, custom headers (like `Authorization`) or methods like PUT/DELETE trigger an `OPTIONS` preflight first. The server must answer it with 2xx and:

```http
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

If your error mentions "Response to preflight request doesn't pass access control check", the `OPTIONS` route is missing or returns an error/redirect.

## Cookies and credentials

With `fetch(url, { credentials: 'include' })`, the server must send `Access-Control-Allow-Credentials: true`, and `Access-Control-Allow-Origin` must be the exact origin, **not `*`**.

## You don't control the server

Call the API from your own backend, or use a dev-server proxy so the browser only talks to your origin:

```js
// vite.config.js
export default { server: { proxy: { '/api': { target: 'https://api.example.com', changeOrigin: true } } } };
```

Then `fetch('/api/data')`.

## Why `mode: 'no-cors'` doesn't help

It returns an **opaque** response: status 0, empty body. Your code still can't read the data.

## Misleading CORS errors

If the server crashes (500) or the URL is wrong (404), error responses often lack CORS headers, so the browser reports CORS instead of the real problem. Check the server logs and the Network tab's status code.
