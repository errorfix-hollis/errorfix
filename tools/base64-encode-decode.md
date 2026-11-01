---
name: "Base64 encode / decode"
title: "Base64 Encode and Decode — UTF-8 safe, URL-safe option"
h1: "Base64 encoder and decoder"
description: "Encode text to Base64 or decode Base64 to text, with full UTF-8 support (emoji, accents) and a URL-safe Base64URL option. Runs entirely in your browser."
intro: "Encode any text to Base64 or decode Base64 back to readable text, with correct UTF-8 handling and an optional URL-safe alphabet."
order: 5
js: base64
keywords: "base64 decode base64 encode online base64url decoder utf-8 base64 to text atob btoa"
related: [python-unicodedecodeerror-utf-8, k8s-createcontainerconfigerror, git-password-authentication-removed]
---
## How Base64 works

Base64 turns arbitrary bytes into 64 safe ASCII characters (`A-Z a-z 0-9 + /`). Every 3 bytes become 4 characters, so the output is about 33% larger. If the input length is not a multiple of 3, the output is padded with one or two `=`. Base64 is an **encoding, not encryption**: anyone can decode it, so never treat a Base64 string as hidden.

| Variant | Characters 62/63 | Padding | Used in |
|---|---|---|---|
| Standard (RFC 4648 §4) | `+` `/` | `=` | email (MIME), data URIs, HTTP Basic auth, Kubernetes Secrets |
| URL-safe (Base64URL, §5) | `-` `_` | usually none | JWTs, URLs, filenames |

The decoder accepts both variants, ignores whitespace and line breaks, adds missing padding, and strips a `data:...;base64,` prefix.

## Text vs. bytes (UTF-8)

Base64 encodes *bytes*, so text has to be turned into bytes first. This tool uses UTF-8, which is what nearly every API expects. The browser's built-in `btoa("é")` works only for Latin-1 and throws on characters like `✓` or emoji, which is why naïve online encoders break. If decoded bytes are not valid UTF-8 the tool tells you and shows them as hex: the data is probably binary (an image, gzip, a key) or in another encoding such as Latin-1, the same situation that causes Python's [UnicodeDecodeError](/python/python-unicodedecodeerror-utf-8/).

## Command-line equivalents

| Task | Linux | macOS |
|---|---|---|
| Encode | `echo -n 'text' \| base64 -w0` | `echo -n 'text' \| base64` |
| Decode | `echo 'dGV4dA==' \| base64 -d` | `echo 'dGV4dA==' \| base64 -D` |

Use `echo -n`: without it the trailing newline gets encoded too, a common reason a Kubernetes Secret value "doesn't match" ([CreateContainerConfigError](/kubernetes/k8s-createcontainerconfigerror/) is a related symptom). An HTTP Basic auth header is just `base64(user:password)`, which is why Git hosts switched to tokens ([password authentication removed](/git/git-password-authentication-removed/)).
