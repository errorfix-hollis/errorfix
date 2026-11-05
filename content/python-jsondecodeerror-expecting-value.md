---
error: "json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 5, in <module>
      data = response.json()
  requests.exceptions.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
  json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
cat: python
description: The string you passed to json.loads() (or response.json()) is not JSON at all. At char 0 it is usually empty, HTML (an error page), or plain text; later positions point at invalid JSON syntax.
tldr: "Print what you are parsing: `print(repr(response.text[:500]), response.status_code)`. Empty body or HTML means the request failed (check status, URL, auth headers). For files, make sure you don't read the file twice and that it isn't empty. Use `json.load(f)` for file objects, `json.loads(s)` for strings, and fix single quotes or trailing commas in hand-written JSON."
keywords: python json decoder jsondecodeerror expecting value line 1 column 1 char 0 requests response json empty response html json.loads json.load invalid json
related: [js-unexpected-token-in-json, python-object-of-type-is-not-json-serializable, python-unicodedecodeerror-utf-8]
---
## What it means

The JSON parser looked for a value (`{`, `[`, `"`, a number, `true`, `false`, `null`) and found something else. The position tells you a lot:

- `line 1 column 1 (char 0)` — the input is **empty** or starts with something that isn't JSON (`<html>`, `Internal Server Error`, a BOM).
- A later position — the input started as JSON but contains invalid syntax there.

Always look at the raw input first:

```python
print(response.status_code, response.headers.get("Content-Type"))
print(repr(response.text[:500]))
```

## Cause 1: the HTTP response is not JSON

The server returned an error page, a redirect to a login page, a 204 No Content, or a rate-limit message. `response.json()` doesn't check the status code.

```python
import requests

r = requests.get(url, headers={"Accept": "application/json"}, timeout=10)
r.raise_for_status()                 # raises on 4xx/5xx instead of a confusing JSON error
if not r.content:
    data = None
elif "application/json" in r.headers.get("Content-Type", ""):
    data = r.json()
else:
    raise ValueError(f"Expected JSON, got: {r.text[:200]!r}")
```

Common reasons for HTML instead of JSON: wrong URL (missing `/api/` prefix), missing or expired auth token, `http://` redirecting to `https://`, or Cloudflare/bot protection. Look up the status code in the [HTTP status codes reference](/tools/http-status-codes/).

## Cause 2: the file is empty or already read

```python
with open("data.json") as f:
    print(f.read())       # consumes the file
    data = json.load(f)   # reads "" -> Expecting value char 0
```

Read once, or `f.seek(0)` before parsing. Also check the file isn't 0 bytes (`ls -l data.json`) — e.g. it was opened with `"w"` and truncated by a crashed write.

## Cause 3: `json.loads` on a file path or `json.load` on a string

```python
json.loads("data.json")      # parses the literal text "data.json" -> error
```

Use `json.load(open(path))` for files and `json.loads(text)` for strings.

## Cause 4: not actually JSON (Python repr, single quotes, comments)

`str(dict)` produces `{'a': 1, 'b': True}`, which is not JSON. Single quotes, `True`/`None`, trailing commas and `//` comments are all invalid:

```python
json.loads("{'a': 1}")   # Expecting property name enclosed in double quotes
```

Produce JSON with `json.dumps()` instead of `str()`. If you must read Python literals, use `ast.literal_eval(text)`. Paste the text into the [JSON formatter](/tools/json-formatter/) to see exactly where it breaks.

## Cause 5: BOM or JSON Lines

A UTF-8 BOM at the start gives `Unexpected UTF-8 BOM` or `Expecting value`. Open with `encoding="utf-8-sig"`.

A `.jsonl` / NDJSON file has one object per line; parsing it as a whole gives `Extra data`. Parse line by line:

```python
with open("data.jsonl", encoding="utf-8") as f:
    rows = [json.loads(line) for line in f if line.strip()]
```
