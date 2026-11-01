---
name: "JSON formatter & validator"
title: "JSON Formatter & Validator — find the exact error line and column"
h1: "JSON formatter and validator"
description: "Free online JSON formatter, validator and minifier. Pretty-print JSON, and see exactly which line and column is invalid and why. Runs in your browser."
intro: "Paste JSON to pretty-print or minify it; if it is invalid, the tool shows the error, its line and column, and highlights the exact character."
order: 1
js: json
keywords: "json validator json formatter json lint pretty print minify beautify unexpected token json parse error"
related: [js-unexpected-token-in-json, js-cannot-read-properties-of-undefined, python-keyerror]
---
## What makes JSON invalid

JSON is much stricter than JavaScript object syntax. These are the mistakes behind almost every `JSON.parse` / `json.loads` error:

| Mistake | Invalid | Valid |
|---|---|---|
| Trailing comma | `{"a": 1,}` | `{"a": 1}` |
| Single quotes | `{'a': 'x'}` | `{"a": "x"}` |
| Unquoted keys | `{a: 1}` | `{"a": 1}` |
| Comments | `{"a": 1 // note}` | not allowed at all |
| Python literals | `True`, `None` | `true`, `null` |
| `undefined`, `NaN`, `Infinity` | `{"a": NaN}` | `{"a": null}` |
| Leading zeros / hex | `007`, `0x1F` | `7`, `31` |
| Raw line break in a string | `"line1⏎line2"` | `"line1\nline2"` |

## Reading the error position

Parsers report the position of the first character they could not accept, which is often *after* the real mistake. A missing comma is reported at the start of the next key; an unclosed bracket is reported at the very end of the input. Look at the highlighted character and the line just before it.

If you got an error like `Unexpected token < in JSON at position 0`, you are not parsing JSON at all: the server returned an HTML page (often a 404 or login page). See [Unexpected token in JSON](/javascript/js-unexpected-token-in-json/) for how to debug that.

## Format vs. minify

**Format** (pretty-print) adds indentation and line breaks so humans can read and diff the data. **Minify** removes all optional whitespace to make the payload smaller for APIs and config storage. Both produce exactly the same data. **Sort keys** orders object keys alphabetically, which makes two JSON documents much easier to compare.

Your JSON is parsed by your own browser's `JSON.parse`. It is never uploaded, so it is safe to paste API responses or config files that contain internal data.
