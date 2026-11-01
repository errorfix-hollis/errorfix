---
name: "URL encode / decode"
title: "URL Encode / Decode Online — encodeURIComponent and query string parser"
h1: "URL encoder, decoder and query string parser"
description: "Percent-encode or decode URLs and query parameters (encodeURIComponent vs encodeURI), and split any URL's query string into a readable table of decoded parameters."
intro: "Percent-encode or decode text for URLs, and paste any URL to see its query parameters decoded in a table."
order: 6
js: url
keywords: "url encode url decode online percent encoding encodeuricomponent decodeuricomponent query string parser %20"
related: [web-err-too-many-redirects, web-cors-no-access-control-allow-origin, web-mixed-content-blocked]
---
## encodeURIComponent vs. encodeURI

| Function | Leaves unencoded | Use it for |
|---|---|---|
| `encodeURIComponent` | `A-Z a-z 0-9 - _ . ! ~ * ' ( )` | a single query value or path segment |
| `encodeURI` | the above plus `; , / ? : @ & = + $ #` | a whole URL that is already structured |

Use `encodeURIComponent` for values: `?q=` + `encodeURIComponent("a&b=c")` gives `?q=a%26b%3Dc`. With `encodeURI` the `&` and `=` would stay and split your value into a second parameter. In most languages the safer equivalent is a query builder: `URLSearchParams` (JS), `urllib.parse.urlencode` (Python), `url.Values` (Go).

## Common percent-encodings

| Character | Encoded | Character | Encoded |
|---|---|---|---|
| space | `%20` (or `+` in forms) | `&` | `%26` |
| `/` | `%2F` | `=` | `%3D` |
| `?` | `%3F` | `#` | `%23` |
| `%` | `%25` | `+` | `%2B` |
| `@` | `%40` | `é` | `%C3%A9` (UTF-8 bytes) |

## `+` or `%20`?

In HTML form data (`application/x-www-form-urlencoded`) and in query strings parsed by most servers, `+` means space. In a URL path, `+` is a literal plus. That is why a `+` in a value must be sent as `%2B`, and why the decoder has a "+ as space" option. Decoding fails with `URIError: malformed URI sequence` when a `%` is not followed by two hex digits; this tool points at the bad `%`.

Encoding bugs show up as broken redirects and callback URLs: a `redirect_uri` or `next=` parameter that is not encoded can loop ([ERR_TOO_MANY_REDIRECTS](/web/web-err-too-many-redirects/)) or point at the wrong origin ([CORS errors](/web/web-cors-no-access-control-allow-origin/)).
