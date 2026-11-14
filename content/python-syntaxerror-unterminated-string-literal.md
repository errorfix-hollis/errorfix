---
error: "SyntaxError: unterminated string literal"
error_full: |2
    File "main.py", line 3
      print("Hello world)
            ^
  SyntaxError: unterminated string literal (detected at line 3)
cat: python
description: "A string was opened with a quote but never closed on the same line. Python 3.10+ says 'unterminated string literal'; older versions say 'EOL while scanning string literal'."
tldr: "Add the missing closing quote. If the string contains the same quote, switch quote types (`\"It's\"`) or escape it (`'It\\'s'`). For Windows paths ending in a backslash use a forward slash or double the backslash (`\"C:\\\\temp\\\\\"`). For multi-line text use triple quotes `\"\"\"...\"\"\"`."
keywords: python syntaxerror unterminated string literal eol while scanning string literal missing quote backslash windows path raw string triple quotes unterminated triple-quoted string
related: [python-syntaxerror-invalid-syntax, python-indentationerror-unexpected-indent, python-unicodedecodeerror-utf-8]
---
## What it means

A normal string literal (`'...'` or `"..."`) must start and end on the same line. When Python reaches the end of the line still inside a string, it stops with:

- Python 3.10+: `SyntaxError: unterminated string literal (detected at line N)`
- Python 3.9 and older: `SyntaxError: EOL while scanning string literal`

The caret `^` points at the opening quote. For triple-quoted strings that never close you get `SyntaxError: unterminated triple-quoted string literal`.

## Cause 1: missing closing quote

```python
print("Hello world)      # SyntaxError
print("Hello world")     # fixed
```

Mismatched quotes count too: `"Hello'` opens with `"` and never closes it.

## Cause 2: the same quote appears inside the string

```python
msg = 'It's done'        # the ' in It's closes the string
```

Fixes:

```python
msg = "It's done"        # use the other quote type
msg = 'It\'s done'       # or escape it
```

Same for double quotes: `"She said "hi""` → `'She said "hi"'`.

## Cause 3: a trailing backslash (Windows paths)

A backslash escapes the next character, so `\"` at the end is an escaped quote, not a closing one:

```python
path = "C:\Users\me\"          # SyntaxError: the final \" is escaped
```

Raw strings don't help here, because a raw string can't end in a single backslash either (`r"C:\temp\"` fails too). Options:

```python
path = "C:\\Users\\me\\"        # double the backslashes
path = "C:/Users/me/"           # forward slashes work on Windows
path = r"C:\Users\me" + "\\"    # raw string + escaped backslash

from pathlib import Path
path = Path("C:/Users/me")      # best: let pathlib handle it
```

Note: even without a trailing backslash, `"C:\Users"` causes `SyntaxError: (unicode error) 'unicodeescape' codec can't decode bytes`, because `\U` starts a Unicode escape. Use `r"C:\Users"` or forward slashes.

## Cause 4: text over several lines

```python
sql = "SELECT *
       FROM users"            # SyntaxError
```

Use triple quotes, or implicit concatenation inside parentheses:

```python
sql = """SELECT *
FROM users"""

sql = (
    "SELECT * "
    "FROM users"
)
```

## Cause 5: f-string quotes (before Python 3.12)

Until Python 3.12 you could not reuse the outer quote type inside an f-string expression:

```python
f"Name: {user["name"]}"     # SyntaxError on 3.11 and older
f"Name: {user['name']}"     # works everywhere
```

## Cause 6: smart quotes pasted from a document

Text copied from Word, Slack or a web page can contain `"` `"` `'` `'` (curly quotes). Python doesn't treat them as quotes; it usually reports `invalid character '"' (U+201C)`, but a mix of straight and curly quotes can leave a string unterminated. Retype the quotes in your editor, or search for `U+201C`, `U+201D`, `U+2018`, `U+2019`.

## Finding it in a big file

Most editors highlight the rest of the line (or the rest of the file) in string colour from the broken quote onwards. Run `python -m py_compile file.py` to get the exact line without running the program.
