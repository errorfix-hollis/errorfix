---
error: "IndentationError: unexpected indent"
error_full: |2
    File "app.py", line 4
      print("done")
  IndentationError: unexpected indent
cat: python
description: A line is indented more than Python expects. Line it up with the block it belongs to, and don't mix tabs and spaces.
tldr: "Go to the line number in the error and remove the extra indentation so it lines up with the surrounding block. Convert tabs to 4 spaces in your editor."
keywords: indentationerror unexpected indent expected an indented block unindent does not match taberror python
related: [python-taberror-inconsistent-use-of-tabs]
---
## What it means

Indentation is syntax in Python. A line that starts further right than the previous line is only allowed after a line ending in `:` (like `if`, `for`, `def`). Here, a line is indented without a reason.

```python
total = 0
    total += 1      # IndentationError: unexpected indent
```

## Fix

Move the line back to the same level as its neighbours:

```python
total = 0
total += 1
```

## The related indentation errors

| Error | Meaning |
|---|---|
| `unexpected indent` | Line indented when it shouldn't be |
| `expected an indented block` | Line after `if ...:` / `def ...:` is not indented (or the block is empty: use `pass`) |
| `unindent does not match any outer indentation level` | A line moved left, but not to a level used before (e.g. 3 spaces where blocks use 4) |
| `TabError: inconsistent use of tabs and spaces` | Tabs and spaces are mixed |

## When the indentation "looks right"

It's almost always invisible tabs mixed with spaces, often from copy-pasting.

- **VS Code:** Ctrl+Shift+P → *Convert Indentation to Spaces*. Turn on *Render Whitespace* to see tabs.
- **Command line:** find tabs with `grep -nP '\t' app.py`, and replace them: `expand -t 4 app.py > fixed.py`.
- Code pasted into the interactive Python shell can also trigger this. Paste into a file instead, or use IPython which handles pasted blocks.
