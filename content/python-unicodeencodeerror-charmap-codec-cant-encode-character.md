---
error: "UnicodeEncodeError: 'charmap' codec can't encode character"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 5, in <module>
      f.write(text)
    File "C:\Python311\Lib\encodings\cp1252.py", line 19, in encode
      return codecs.charmap_encode(input,self.errors,encoding_table)[0]
  UnicodeEncodeError: 'charmap' codec can't encode character '\u2713' in position 0: character maps to <undefined>
cat: python
description: "Python tried to write text using a legacy Windows code page (usually cp1252) that has no byte for one of the characters, such as emoji, CJK text or symbols. It happens when a file is opened without an encoding, or when output is redirected or piped on Windows."
tldr: "Open files with an explicit encoding: `open(path, \"w\", encoding=\"utf-8\")` (also `df.to_csv(path, encoding=\"utf-8\")`). For print output, run with UTF-8 mode: `python -X utf8 app.py` or set `PYTHONUTF8=1`, or call `sys.stdout.reconfigure(encoding=\"utf-8\")` at startup."
keywords: python unicodeencodeerror charmap codec can't encode character maps to undefined cp1252 windows print emoji open encoding utf-8 PYTHONUTF8 PYTHONIOENCODING -X utf8 redirect
related: [python-unicodedecodeerror-utf-8, python-syntaxerror-unicode-error-unicodeescape-codec-cant-decode-bytes, python-filenotfounderror-no-such-file-or-directory]
---
## What it means

Strings in Python 3 are Unicode. Writing them to a file or a byte stream requires an encoding. On Windows, if you don't specify one, Python uses the locale's code page, typically `cp1252` (Western Europe/US). That code page has only 256 characters; anything else (`✓`, `€` is fine but `→`, emoji, Chinese...) has no mapping, hence `character maps to <undefined>`.

The traceback mentions `cp1252.py` (or another `cpXXXX`), which tells you the encoding in use.

## Cause 1: open() without encoding

```python
# Wrong on Windows: uses cp1252
with open("out.txt", "w") as f:
    f.write("Done ✓")

# Right
with open("out.txt", "w", encoding="utf-8") as f:
    f.write("Done ✓")
```

The same applies to libraries that write files:

```python
df.to_csv("out.csv", encoding="utf-8")          # pandas
json.dump(data, open("d.json", "w", encoding="utf-8"), ensure_ascii=False)
```

If the file must be opened by Excel, `encoding="utf-8-sig"` adds a BOM so Excel detects UTF-8.

## Cause 2: print() when output is redirected or piped

Since Python 3.6 the interactive Windows console uses UTF-8, so `print("✓")` works in a terminal. But when stdout is redirected (`python app.py > log.txt`), piped, captured by a subprocess, an IDE, a scheduled task or a service, Python falls back to the code page and print fails.

Options, from broadest to narrowest:

```bash
# UTF-8 mode for everything (files and std streams)
set PYTHONUTF8=1             # cmd
$env:PYTHONUTF8 = "1"        # PowerShell
python -X utf8 app.py        # per run

# Only the std streams
set PYTHONIOENCODING=utf-8
```

Or fix it in code, at the top of the script:

```python
import sys
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
```

## Cause 3: reading output of a subprocess

When you capture another program's output as text, Python decodes/encodes with the locale encoding too. Be explicit:

```python
subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
```

## Cause 4: you can't change the target encoding

If something downstream really requires cp1252 (an old system, a legacy file format), decide what to do with characters it can't hold:

```python
text.encode("cp1252", errors="replace")       # unknown chars become ?
text.encode("cp1252", errors="xmlcharrefreplace")  # &#10003;
open("out.txt", "w", encoding="cp1252", errors="replace")
```

## Make UTF-8 the default

On Windows 10/11 you can also enable "Beta: Use Unicode UTF-8 for worldwide language support" in the region settings, which changes the system code page to UTF-8. It affects all programs, so test before relying on it; setting `encoding="utf-8"` in code is the portable fix.
