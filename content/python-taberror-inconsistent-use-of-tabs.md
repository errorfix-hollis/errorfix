---
error: "TabError: inconsistent use of tabs and spaces in indentation"
cat: python
description: Your file mixes tab characters and spaces for indentation. Convert everything to spaces.
tldr: "Convert all tabs to 4 spaces: in VS Code use Ctrl+Shift+P → Convert Indentation to Spaces; on the command line `expand -t 4 file.py > tmp && mv tmp file.py`."
keywords: taberror inconsistent tabs spaces indentation python 3 convert
related: [python-indentationerror-unexpected-indent]
---
## What it means

Python 3 refuses to guess how wide a tab is. If one block mixes tabs and spaces, it raises `TabError` instead of running code that might mean something different from what it looks like.

## Fix

Use spaces only (PEP 8 recommends 4 per level).

**VS Code:** Ctrl+Shift+P → *Convert Indentation to Spaces*, and set `"editor.insertSpaces": true`.

**PyCharm:** Edit → Convert Indents → To Spaces.

**Vim:** `:set expandtab` then `:retab`.

**Command line:**

```bash
expand -t 4 script.py > script_fixed.py && mv script_fixed.py script.py
```

## Find the tabs

```bash
grep -nP '\t' script.py
```

## Prevent it

Add an `.editorconfig` file to your project:

```ini
[*.py]
indent_style = space
indent_size = 4
```

Formatters like `black` or `ruff format` also normalise indentation every time you save.
