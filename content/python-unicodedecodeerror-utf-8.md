---
error: "UnicodeDecodeError: 'utf-8' codec can't decode byte 0xff in position 0: invalid start byte"
cat: python
description: You're reading a file as UTF-8 but it's in another encoding (often Windows-1252, Latin-1 or UTF-16) — or it's not text at all. Open it with the right encoding.
tldr: "Pass the real encoding: `open(path, encoding='cp1252')` (Windows Excel CSVs), `'utf-16'` (byte 0xff/0xfe at position 0), or `'latin-1'`. For binary files, open with `'rb'`."
keywords: unicodedecodeerror utf-8 codec can't decode byte invalid start byte continuation byte pandas read_csv encoding python
related: [python-modulenotfounderror-no-module-named]
---
## What it means

UTF-8 has strict rules for which byte sequences are valid. The file contains a byte that can't appear at that point in UTF-8, so it wasn't written as UTF-8.

## Reading the clue in the message

| Byte in the error | Likely encoding |
|---|---|
| `0xff` or `0xfe` in **position 0** | UTF-16 (has a byte-order mark) |
| `0x92`, `0x93`, `0x96`, `0xe9` somewhere in the middle | Windows-1252 (`cp1252`) or Latin-1 |
| `0x89` in position 0 | it's a PNG image, not text |
| `0x8b` in position 1 | it's gzip-compressed |

## Fix: specify the encoding

```python
with open("data.csv", encoding="cp1252") as f:
    text = f.read()
```

pandas:

```python
df = pd.read_csv("data.csv", encoding="cp1252")     # or "utf-16", "latin-1"
```

`latin-1` never raises this error (every byte is valid), which makes it a handy fallback, but accented characters may come out wrong if the real encoding was different.

## Don't know the encoding?

```bash
file -i data.csv
```

or in Python:

```bash
pip install charset-normalizer
```

```python
from charset_normalizer import from_path
print(from_path("data.csv").best().encoding)
```

## Keep going and replace bad bytes

```python
open("log.txt", encoding="utf-8", errors="replace")   # bad bytes become �
```

## It's a binary file

Images, PDFs, Excel `.xlsx` and pickles aren't text. Open them in binary mode (`"rb"`) or with the right library (`openpyxl`/`pd.read_excel` for `.xlsx`).

## On Windows, writing files

The reverse problem (`UnicodeEncodeError: 'charmap' codec can't encode`) comes from Windows' default encoding. Always pass `encoding="utf-8"` when writing, or set `PYTHONUTF8=1`.
