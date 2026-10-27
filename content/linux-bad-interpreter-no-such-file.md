---
error: "/bin/bash^M: bad interpreter: No such file or directory"
cat: linux
description: The script has Windows (CRLF) line endings, so Linux looks for an interpreter literally named "bash\r". Convert the file to Unix line endings.
tldr: "Run `sed -i 's/\\r$//' script.sh` (or `dos2unix script.sh`). Prevent it with a `.gitattributes` line: `*.sh text eol=lf`."
keywords: bad interpreter no such file or directory ^M crlf windows line endings dos2unix shebang bash script
related: [docker-exec-format-error, linux-permission-denied-running-script]
---
## What it means

The `^M` is a carriage return (`\r`). Windows ends lines with `\r\n`, Linux with `\n`. Your first line is read as `#!/bin/bash\r`, and there's no program called `bash\r`.

## Fix

```bash
sed -i 's/\r$//' script.sh
```

or

```bash
sudo apt install dos2unix
dos2unix script.sh
```

Check the result: `file script.sh` should no longer say "with CRLF line terminators".

## Fix it in your editor

- **VS Code:** click `CRLF` in the status bar and choose `LF`, then save.
- **Notepad++:** Edit → EOL Conversion → Unix (LF).

## Stop Git from converting it again

On Windows, `core.autocrlf=true` converts files to CRLF on checkout. Pin shell scripts to LF in the repository:

```gitattributes
# .gitattributes
*.sh text eol=lf
```

Then renormalise once: `git add --renormalize . && git commit -m "Normalize line endings"`.

## Other "bad interpreter" causes

If there's no `^M`, the interpreter path itself is wrong (e.g. `#!/usr/bin/python` on a system that only has `python3`). Use `#!/usr/bin/env python3` or `#!/usr/bin/env bash` so the interpreter is found on PATH.
