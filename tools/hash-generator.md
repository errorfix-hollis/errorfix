---
name: "Hash generator (MD5, SHA-256, SHA-512)"
title: "Hash Generator — MD5, SHA-1, SHA-256, SHA-512 of text or files, verify checksums"
h1: "Hash generator: MD5, SHA-1, SHA-256, SHA-384, SHA-512"
description: "Calculate MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes of text or a file and compare against an expected checksum. Files are hashed locally and never uploaded."
intro: "Type text or pick a file to get its MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes at once, then paste an expected checksum to verify a download."
order: 13
js: hash
keywords: "hash generator md5 generator sha256 generator sha256 online sha512 sha1 checksum calculator verify checksum file hash sha256sum md5sum sri hash"
related: [ssh-remote-host-identification-has-changed, docker-manifest-unknown, git-rpc-failed-curl-92-early-eof]
---
## Verifying a download

Download pages publish a checksum so you can confirm the file is complete and unmodified. Pick the file above and paste the published value into *Compare*: the matching algorithm turns green. The comparison accepts plain hex, `sha256sum` output (`hash  filename`), BSD style (`SHA256 (file) = hash`), `sha256:` prefixes and Base64 SRI values. A mismatch means the download is corrupted or incomplete, or you have a different version than the one the checksum is for.

The same check on the command line:

| OS | SHA-256 | MD5 |
|---|---|---|
| Linux | `sha256sum file` | `md5sum file` |
| macOS | `shasum -a 256 file` | `md5 file` |
| Windows PowerShell | `Get-FileHash file` | `Get-FileHash file -Algorithm MD5` |

On Linux you can verify a whole list with `sha256sum -c SHA256SUMS`.

## Why text hashes do not match

A hash changes completely if a single byte changes. When your hash of a string differs from someone else's, it is usually:

- **A trailing newline.** `echo "abc" | sha256sum` hashes `abc\n`. Use `printf '%s' abc | sha256sum` or `echo -n`.
- **Encoding.** This tool hashes text as UTF-8; Windows tools sometimes use UTF-16.
- **Line endings.** CRLF and LF files have different hashes.
- **Hex case or format.** `ABC1...` and `abc1...` are the same hash; Base64 is a different spelling of the same bytes.

## Which algorithm?

**MD5** and **SHA-1** are broken for security: attackers can create collisions. They are still fine for detecting accidental corruption and are used by ETags and Git object IDs. Use **SHA-256** or **SHA-512** for anything security-related, and never use plain hashes for passwords (use bcrypt, scrypt or Argon2). For Subresource Integrity, choose *Base64* output and prefix it: `integrity="sha384-…"`.

SHA hashes are computed with your browser's built-in Web Crypto API; MD5 is computed in JavaScript. Files are read locally and are never uploaded.
