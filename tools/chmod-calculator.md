---
name: "chmod calculator"
title: "chmod Calculator — convert 755, 644, rwxr-xr-x permissions"
h1: "chmod calculator"
description: "Convert Linux file permissions between checkboxes, octal (755, 644) and symbolic (rwxr-xr-x) notation, including setuid, setgid and sticky bits, and get the chmod command."
intro: "Tick the permissions you want, or type an octal or symbolic mode, and get the matching chmod command."
order: 3
js: chmod
keywords: "chmod calculator chmod 755 chmod 644 chmod 777 linux file permissions octal rwxr-xr-x unix permissions"
related: [linux-permission-denied-running-script, ssh-unprotected-private-key-file, npm-eacces-permission-denied, docker-permission-denied-docker-sock]
---
## How octal permissions work

Each digit is the sum of **read = 4**, **write = 2** and **execute = 1**, for owner, group and others in that order. So `7 = 4+2+1 = rwx`, `5 = 4+1 = r-x`, `4 = r--`, `0 = ---`.

| Octal | Symbolic | Typical use |
|---|---|---|
| `644` | `rw-r--r--` | normal files, web content, configs |
| `755` | `rwxr-xr-x` | directories, scripts and binaries |
| `600` | `rw-------` | private files: SSH keys, `.env`, credentials |
| `700` | `rwx------` | private directories such as `~/.ssh` |
| `400` | `r--------` | read-only secrets, AWS `.pem` keys |
| `775` | `rwxrwxr-x` | shared project directories for a group |
| `777` | `rwxrwxrwx` | everyone can write: almost always a mistake |
| `1777` | `rwxrwxrwt` | `/tmp`: sticky bit, users can only delete their own files |

For **directories**, `r` lets you list names, `w` lets you create and delete entries, and `x` lets you enter the directory and reach files inside it. A directory without `x` is effectively closed even if its files are readable.

## Special bits

The optional fourth (leading) digit holds **setuid = 4** (run as the file owner, e.g. `passwd`), **setgid = 2** (run as the group; on directories new files inherit the group) and **sticky = 1** (on directories only the owner can delete files). In `ls -l` they appear as `s`/`t` in the execute position, or capital `S`/`T` when execute is not set.

## Common fixes

- `Permission denied` running a script: `chmod +x script.sh` (or `chmod 755`). See [permission denied running a script](/linux/linux-permission-denied-running-script/).
- SSH refuses a key with *UNPROTECTED PRIVATE KEY FILE*: `chmod 600 ~/.ssh/id_ed25519` and `chmod 700 ~/.ssh`. See [unprotected private key file](/ssh/ssh-unprotected-private-key-file/).
- Recursive changes: use `find . -type d -exec chmod 755 {} +` and `find . -type f -exec chmod 644 {} +` instead of `chmod -R 777`.
- If the real problem is *ownership*, `chown` is the fix, not chmod: see [npm EACCES](/npm/npm-eacces-permission-denied/) and [docker.sock permission denied](/docker/docker-permission-denied-docker-sock/).
