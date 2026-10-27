---
error: "warning: LF will be replaced by CRLF the next time Git touches it"
error_full: "warning: in the working copy of 'index.js', LF will be replaced by CRLF the next time Git touches it"
cat: git
description: A harmless line-ending notice on Windows. Git converts line endings because core.autocrlf is on. Use .gitattributes to control it per project.
tldr: "It's only a warning. To make line endings consistent, add a `.gitattributes` with `* text=auto eol=lf`, then run `git add --renormalize .`."
keywords: lf will be replaced by crlf warning windows git autocrlf gitattributes line endings
related: [linux-bad-interpreter-no-such-file]
---
## What it means

Windows uses CRLF (`\r\n`) line endings, Linux and macOS use LF (`\n`). With `core.autocrlf=true` (the Git for Windows default), Git stores LF in the repository and converts to CRLF in your working folder. The warning just tells you a file will be converted. Nothing is broken.

## Make it consistent for everyone (recommended)

Add a `.gitattributes` file at the repository root:

```gitattributes
* text=auto eol=lf
*.bat text eol=crlf
*.png binary
```

Then renormalise once and commit:

```bash
git add --renormalize .
git commit -m "Normalize line endings"
```

`.gitattributes` is committed, so every clone gets the same behaviour, unlike `core.autocrlf` which is a per-machine setting.

## Just silence it

Choose your preference globally:

```bash
git config --global core.autocrlf input   # store LF, don't convert to CRLF on checkout
git config --global core.safecrlf false   # don't warn
```

## When it matters

Shell scripts with CRLF fail on Linux with `bad interpreter: ^M` errors, so files that run on Linux or in Docker should be LF. Most modern Windows editors handle LF without problems.
