---
name: "cURL to code converter"
title: "cURL to Code Converter — curl command to Python, JavaScript fetch, Go, PHP"
h1: "Convert curl to Python, JavaScript, Go and PHP"
description: "Paste a curl command (e.g. 'Copy as cURL' from Chrome or Firefox DevTools) and get equivalent code for Python requests, JavaScript fetch, Node.js axios, Go net/http and PHP cURL. Handles headers, JSON, form data, file uploads, auth and cookies."
intro: "Turn a curl command into ready-to-run Python, JavaScript (fetch), Node.js (axios), Go or PHP code. Supports -X, -H, -d/--data-raw/--data-binary/--data-urlencode, --json, -F file uploads, -u, -b, -L, -k, --compressed and multi-line commands."
order: 16
js: curl
keywords: "curl to python curl to python requests curl to fetch curl to javascript curl to axios curl to go curl to php convert curl command copy as curl"
related: [web-cors-no-access-control-allow-origin, web-curl-60-ssl-certificate-problem, python-ssl-certificate-verify-failed, python-jsondecodeerror-expecting-value]
---
## What gets converted

| curl option | Meaning | Becomes |
|---|---|---|
| `-X PUT` | request method | the method (default `GET`, or `POST` when there is a body) |
| `-H 'K: V'` | header | a header entry |
| `-d`, `--data-raw`, `--data-binary` | request body | the body; several `-d` are joined with `&` |
| `--json '{…}'` | JSON body | body + `Content-Type`/`Accept: application/json` |
| `--data-urlencode` | URL-encoded field | encoded `name=value` |
| `-F name=@file` | multipart form / upload | `files=` / `FormData` / `CURLFile` |
| `-u user:pass` | Basic auth | `auth=` / `Authorization: Basic …` |
| `-b 'a=1; b=2'` | cookies | `cookies=` or a `Cookie` header |
| `-G` | put `-d` data in the query string | appended to the URL |
| `-L`, `-k`, `--compressed`, `-m`, `-x` | redirects, TLS, gzip, timeout, proxy | library options |

The command is parsed the way a POSIX shell would read it: single and double quotes, `$'…'` strings (which Chrome uses for bodies containing quotes or newlines), backslash escapes and `\` line continuations all work. Each generated program was checked against real curl: it sends the same method, URL, headers and body.

## Differences to keep in mind

- **Redirects.** curl does not follow redirects unless you pass `-L`, but requests, fetch, axios and Go follow them by default.
- **`-d` sets a form content type.** curl sends `Content-Type: application/x-www-form-urlencoded` with `-d` even when the body is JSON. If your API expects JSON, add `-H 'Content-Type: application/json'` or use `--json`, otherwise the server may reply with a 415 or fail to parse the body (see [JSONDecodeError: Expecting value](/python/python-jsondecodeerror-expecting-value/)).
- **`-k` turns off certificate checks.** Use it for testing only. The real fix for [curl: (60) SSL certificate problem](/web/web-curl-60-ssl-certificate-problem/) is to trust the right CA bundle.
- **Browsers are stricter than curl.** A request that works with curl can still fail in the browser because of [CORS](/web/web-cors-no-access-control-allow-origin/), and browsers silently drop headers such as `Cookie`, `User-Agent` and `Host`.

Secrets in the command (tokens, passwords, cookies) stay in this page: nothing is sent anywhere.
