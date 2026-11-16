---
error: "SyntaxWarning: invalid escape sequence '\\d'"
error_full: |
  /app/utils.py:12: SyntaxWarning: invalid escape sequence '\d'
    pattern = re.compile("\d+\.\d+")
cat: python
description: "A normal string literal contains a backslash followed by a character that isn't a valid escape (like \\d, \\s, \\. or a Windows path). Python 3.12 upgraded this from a hidden DeprecationWarning to a visible SyntaxWarning."
tldr: "Use a raw string for regexes and Windows paths: `re.compile(r\"\\d+\\.\\d+\")`, `r\"C:\\Users\\me\"`. Or double the backslash (`\"\\\\d\"`), or use forward slashes in paths. For warnings from third-party packages, upgrade the package."
keywords: syntaxwarning invalid escape sequence python 3.12 deprecationwarning raw string regex backslash windows path \d \s \. r prefix
related: [python-syntaxerror-unicode-error-unicodeescape-codec-cant-decode-bytes, python-syntaxerror-invalid-syntax, python-filenotfounderror-no-such-file-or-directory]
---
## What it means

In a regular Python string, a backslash starts an escape sequence: `\n`, `\t`, `\\`, `\"`, `\x41`, `\u00e9`, and so on. When the backslash is followed by something that isn't a recognised escape — `\d`, `\s`, `\w`, `\.`, `\(`, `\p`, `\U` in some contexts — Python keeps the backslash as-is, but warns that this is invalid.

- Python 3.6–3.11: `DeprecationWarning` (hidden by default).
- Python 3.12+: `SyntaxWarning`, printed when the file is compiled.
- A future Python version will make it a `SyntaxError`.

The string still works today, which is why the code "ran fine before". The warning is shown once per file when the `.pyc` is compiled, so it may appear only on first run.

## Fix 1: regular expressions — use raw strings

```python
import re

# Warns
re.compile("\d+\.\d+")
re.sub("\s+", " ", text)

# Fixed
re.compile(r"\d+\.\d+")
re.sub(r"\s+", " ", text)
```

A raw string (`r"..."`) passes every backslash to `re` untouched, which is what the regex engine expects. Use `r""` for every regex pattern, even ones without backslashes — it's the standard convention. Test patterns in the [regex tester](/tools/regex-tester/).

## Fix 2: Windows paths

```python
# Warns ("\P", "\d") - and "\n"/"\t" would silently break the path
path = "C:\Projects\data\new.csv"
```

Any of these work:

```python
path = r"C:\Projects\data\new.csv"
path = "C:\\Projects\\data\\new.csv"
path = "C:/Projects/data/new.csv"        # Windows accepts forward slashes

from pathlib import Path
path = Path("C:/Projects") / "data" / "new.csv"
```

Note that a raw string cannot end with a single backslash: `r"C:\dir\"` is a syntax error. Use `"C:\\dir\\"` or `pathlib`.

## Fix 3: docstrings containing backslashes

LaTeX or regex examples in docstrings trigger the warning too:

```python
def area(r):
    r"""Return \pi r^2."""      # raw docstring
```

## Fix 4: escaping you actually meant

If you wanted a literal backslash followed by a character, double it: `"\\d"`. If you meant a real escape, check the spelling — e.g. `"\e"` is not an escape in Python (use `"\x1b"` or `"\033"` for ESC).

## Find all occurrences

Compile the whole project with warnings turned into errors to list every file and line:

```bash
python -W error::SyntaxWarning -m compileall -f -q .
```

Linters catch this too: ruff/pycodestyle rule `W605` (invalid escape sequence). `ruff check --select W605 --fix .` can rewrite many of them automatically.

## Warnings from installed packages

If the path in the warning is inside `site-packages`, it's a library that hasn't been updated for Python 3.12. Upgrade it (`python -m pip install -U <package>`). Until then you can silence it at startup:

```bash
python -W "ignore::SyntaxWarning" app.py
```

Silencing is a stop-gap — the code will break when the warning becomes an error.
