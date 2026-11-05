---
name: "Line ending & whitespace inspector"
title: "Line Ending & Whitespace Inspector — find CRLF, tabs, BOM, invisible characters"
h1: "Line ending and whitespace inspector"
description: "Check a file for CRLF vs LF line endings, tabs vs spaces, trailing whitespace, a BOM, non-breaking spaces and zero-width characters, then normalize and download it. Runs in your browser."
intro: "Open a file or paste text to see its line endings, indentation, BOM and any invisible characters, then normalize it with one click."
order: 14
js: whitespace
keywords: "crlf lf checker line endings checker detect crlf windows line endings tabs vs spaces trailing whitespace byte order mark bom remove zero width space non breaking space invisible characters"
related: [git-lf-will-be-replaced-by-crlf, python-taberror-inconsistent-use-of-tabs, linux-bad-interpreter-no-such-file, docker-standard-init-linux-exec-user-process-caused-no-such-file-or-directory]
---
## Why invisible characters break things

| Problem | Typical error | Fix |
|---|---|---|
| CRLF line endings in a shell script | `/bin/bash^M: bad interpreter`, `exec user process caused: no such file or directory` in Docker | Convert to LF ([bad interpreter](/linux/linux-bad-interpreter-no-such-file/)) |
| Mixed CRLF / LF | Git warning `LF will be replaced by CRLF`, noisy diffs | Pick one and set `.gitattributes` ([LF will be replaced by CRLF](/git/git-lf-will-be-replaced-by-crlf/)) |
| Tabs and spaces mixed | Python `TabError: inconsistent use of tabs and spaces`, YAML "found character that cannot start any token" | Convert tabs to spaces ([TabError](/python/python-taberror-inconsistent-use-of-tabs/)) |
| UTF-8 BOM | `Unexpected token` in JSON, `#!` line ignored, PHP "headers already sent" | Remove the BOM |
| Non-breaking space (U+00A0) | `SyntaxError: invalid non-printable character`, "command not found" for a pasted command | Replace with a normal space |
| Zero-width space (U+200B) | A variable or key that "exists" but is never found | Remove it |
| Smart quotes `“ ”` | Syntax errors in code copied from documents or chat | Straighten them |

## Pasting vs opening a file

Browsers convert every pasted line break to LF, so the line-ending count is only reliable when you **open the file** with the button above. Opening a file also reports its encoding (UTF-8, UTF-8 with BOM, UTF-16, or not valid UTF-8). The file is read locally and never uploaded; *Download result* saves the normalized version with the original name.

## Doing it from the command line

```bash
file script.sh                      # "with CRLF line terminators"
cat -A script.sh | head             # ^M$ = CRLF, ^I = tab, M-BM-  = NBSP
sed -i 's/\r$//' script.sh          # CRLF -> LF (or: dos2unix script.sh)
sed -i 's/[ \t]*$//' file           # strip trailing whitespace
sed -i '1s/^\xEF\xBB\xBF//' file    # remove a UTF-8 BOM
expand -t 4 in.py > out.py          # tabs -> 4 spaces
grep -nP '[\x{00A0}\x{200B}]' file  # find NBSP and zero-width spaces
```

To stop the problem coming back, add `* text=auto eol=lf` to `.gitattributes` and an `.editorconfig` with `end_of_line = lf` and `indent_style = space`.
