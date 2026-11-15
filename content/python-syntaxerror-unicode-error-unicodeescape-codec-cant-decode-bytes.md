---
error: "SyntaxError: (unicode error) 'unicodeescape' codec can't decode bytes in position 2-3: truncated \\UXXXXXXXX escape"
error_full: |2
    File "script.py", line 3
      df = pd.read_csv("C:\Users\me\Desktop\data.csv")
                                                    ^
  SyntaxError: (unicode error) 'unicodeescape' codec can't decode bytes in position 2-3: truncated \UXXXXXXXX escape
cat: python
description: "A Windows path in a normal string literal contains a backslash sequence like \\U or \\N that Python reads as a Unicode escape. Use a raw string, forward slashes, or doubled backslashes."
tldr: "Prefix the string with r: `r\"C:\\Users\\me\\data.csv\"`, or use forward slashes `\"C:/Users/me/data.csv\"`, or double every backslash `\"C:\\\\Users\\\\me\\\\data.csv\"`. Better still, build paths with `pathlib.Path`."
keywords: python syntaxerror unicode error unicodeescape codec can't decode bytes truncated uxxxxxxxx escape windows path backslash raw string c users read_csv open
related: [python-syntaxerror-invalid-syntax, python-filenotfounderror-no-such-file-or-directory, python-unicodedecodeerror-utf-8]
---
## What it means

In a normal Python string, a backslash starts an escape sequence: `\n` is a newline, `\t` is a tab, and `\U` must be followed by **8 hex digits** (`\U0001F600`). In the path `"C:\Users\..."`, Python sees `\U` followed by `sers` (not hex) and refuses to compile the file. That's why this is a `SyntaxError` that appears before any code runs.

Variants of the same problem:

- `truncated \UXXXXXXXX escape`: `\U` as in `C:\Users`
- `truncated \xXX escape`: `\x` as in `C:\xampp`
- `malformed \N character escape`: `\N` as in `C:\New folder`
- No error, but a wrong path: `\n`, `\t`, `\a`, `\b`, `\f`, `\r`, `\v` are *valid* escapes. They silently turn into control characters, so `"C:\data\new.csv"` contains a newline and later raises `FileNotFoundError` or `OSError: [Errno 22] Invalid argument`.
- On Python 3.12+, unknown escapes like `\d` give `SyntaxWarning: invalid escape sequence '\d'`.

## Fix 1: raw string

Prefix the literal with `r` so backslashes are kept as-is:

```python
df = pd.read_csv(r"C:\Users\me\Desktop\data.csv")
```

One catch: a raw string can't end with a single backslash (`r"C:\folder\"` is a syntax error). Leave the trailing backslash off, or use Fix 2 or Fix 4.

## Fix 2: forward slashes

Windows accepts `/` as a path separator in nearly all APIs:

```python
df = pd.read_csv("C:/Users/me/Desktop/data.csv")
```

## Fix 3: escape each backslash

```python
df = pd.read_csv("C:\\Users\\me\\Desktop\\data.csv")
```

## Fix 4: pathlib (best for real code)

```python
from pathlib import Path

data = Path.home() / "Desktop" / "data.csv"
df = pd.read_csv(data)
```

No hard-coded separators, and it works on every OS. `Path(__file__).parent / "data.csv"` gives a path relative to the script instead of the current working directory.

## Same error in other places

- **Docstrings and comments in strings:** a docstring with `"""Reads C:\Users\..."""` triggers it too. Make it a raw docstring `r"""..."""` or escape the backslash.
- **Regex patterns:** always use raw strings, `re.compile(r"\d+\.\w+")`. This also avoids the Python 3.12 `invalid escape sequence` warning.
- **Strings read from files or `input()`** are *not* affected. Escapes only apply to literals in source code. If a path from a config file looks wrong, the problem is elsewhere.

## `UnicodeDecodeError: 'unicodeescape'` at runtime

If you see this while running code (not compiling), something is calling `.decode("unicode_escape")` or `codecs.decode(s, "unicode_escape")` on text that contains Windows paths. Don't decode paths that way. Treat them as plain strings.
