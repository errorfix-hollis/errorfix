---
error: "SyntaxError: Unexpected end of input"
error_full: |
  Uncaught SyntaxError: Unexpected end of input
  SyntaxError: Unexpected end of JSON input
  SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
cat: javascript
description: "The parser reached the end of the code (or JSON text) while it still expected more — an unclosed `{`, `(`, `[`, string or template literal, or an empty/truncated JSON response."
tldr: "For code: find the unclosed bracket, quote or backtick (format the file with Prettier or check matching braces in your editor). For `Unexpected end of JSON input`: the string you passed to `JSON.parse()` / `res.json()` is empty — check `res.ok` and `await res.text()` first, and don't call `.json()` on 204 or `no-cors` responses."
keywords: javascript syntaxerror unexpected end of input unexpected end of json input json.parse response.json empty body missing closing brace bracket fetch 204 no-cors
related: [js-unexpected-token-in-json, js-typeerror-failed-to-fetch, js-syntaxerror-identifier-has-already-been-declared]
---
## What it means

The JavaScript (or JSON) parser ran out of characters before the structure was complete. There are two very different situations with the same message:

- **`Unexpected end of input`** — your *source code* has something unclosed.
- **`Unexpected end of JSON input`** — `JSON.parse()` or `response.json()` got an empty or cut-off string.

## Cause 1: unclosed brace, parenthesis or bracket

```js
function greet(name) {
  if (name) {
    console.log(`Hi ${name}`);
  }
// missing } for the function
```

The error points at the last line of the file, not where the brace is missing. To find it:

- Run Prettier (`npx prettier --check file.js`) or ESLint — they report the location more precisely.
- Use your editor's bracket matching / fold markers and look for the block that "swallows" the rest of the file.
- Check callbacks: `}, []);` and `});` are easy to get wrong in `useEffect`, `addEventListener`, and promise chains.

## Cause 2: unclosed string or template literal

A missing closing backtick makes the rest of the file one string:

```js
const html = `<div>${title}</div>;
```

Syntax highlighting usually makes this obvious — everything after it is coloured as a string.

## Cause 3: inline code in HTML attributes

`onclick="doThing({a: 1)"` or code generated into a `<script>` tag can be truncated. Check what the browser actually received (DevTools → Sources), not your template.

## Cause 4: `JSON.parse("")` — empty input

```js
JSON.parse("");            // SyntaxError: Unexpected end of JSON input
JSON.parse(localStorage.getItem("cart"));   // fine for null, but "" fails
```

Guard against empty strings:

```js
const raw = localStorage.getItem("cart");
const cart = raw ? JSON.parse(raw) : [];
```

## Cause 5: `response.json()` on an empty body

`fetch` responses with no body — `204 No Content`, many `DELETE`/`POST` endpoints, errors from the server, or **any `mode: "no-cors"` response** (opaque, always empty) — throw when you call `.json()`.

```js
const res = await fetch("/api/items", { method: "POST", body });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const text = await res.text();
const data = text ? JSON.parse(text) : null;
```

Don't use `mode: "no-cors"` to "fix" CORS; you can't read that response at all. Fix CORS on the server instead.

On the server side (Express etc.), make sure the handler actually sends JSON: `res.json(obj)`, not `res.end()` or `res.sendStatus(200)`.

## Cause 6: a truncated file or download

A partially written JSON file, a timeout mid-response, or a bundler that crashed can leave incomplete content. Re-download / rebuild and check the file's end with `tail -c 200 file.json`.
