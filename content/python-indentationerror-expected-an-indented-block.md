---
error: "IndentationError: expected an indented block"
error_full: |2
    File "app.py", line 3
      print("hello")
      ^
  IndentationError: expected an indented block after function definition on line 2
cat: python
description: "A line ending in a colon (def, if, for, while, class, try, with) must be followed by at least one indented line. The block is empty or not indented."
tldr: "Indent the line(s) after the `:` by 4 spaces. If the block is intentionally empty (a stub), put `pass` (or `...`) in it. Make sure you don't mix tabs and spaces."
keywords: python indentationerror expected an indented block after function definition if statement for loop pass empty block colon indentation
related: [python-indentationerror-unexpected-indent, python-taberror-inconsistent-use-of-tabs, python-syntaxerror-invalid-syntax]
---
## What it means

Python uses indentation to define blocks. Every statement that ends with `:` opens a block, and the next non-blank line must be indented more than the statement itself. If it isn't, Python stops with this error. Since Python 3.9/3.10 the message also names the statement: `expected an indented block after 'if' statement on line 5`.

The line number in the error points to the line that *should* be indented; the line in "after ... on line N" is the one that opened the block.

## Cause 1: the body isn't indented

```python
def greet(name):
print("hello", name)      # IndentationError
```

Fix: indent the body (PEP 8 uses 4 spaces):

```python
def greet(name):
    print("hello", name)
```

## Cause 2: the block is empty

Stubs, TODOs and placeholder branches need at least one statement. A comment alone does not count:

```python
if user.is_admin:
    # TODO
else:                     # IndentationError: expected an indented block after 'if'
    deny()
```

Fix: use `pass` (or `...`):

```python
if user.is_admin:
    pass  # TODO
else:
    deny()

class MyError(Exception):
    pass

def not_done_yet():
    ...
```

## Cause 3: tabs and spaces mixed

A line can *look* indented in your editor while Python sees something different, because a tab is displayed as 2, 4 or 8 columns. This can produce this error, `unexpected indent` or `TabError`.

Fix: convert the whole file to spaces.

- VS Code: click "Spaces/Tab Size" in the status bar → *Convert Indentation to Spaces*.
- Command line: `expand -t 4 app.py > app_fixed.py`
- Find tabs: `grep -nP '\t' app.py`

Then check the file compiles:

```bash
python -m py_compile app.py
```

## Cause 4: code pasted from the web or a chat

Copying from web pages, PDFs or chat apps often strips leading whitespace or adds non-breaking spaces (`U+00A0`). Re-indent the pasted block manually, or find odd characters with:

```bash
grep -nP '[^\x00-\x7F]' app.py
```

If you need to see invisible characters (tabs, NBSP, CRLF), paste the code into the [line ending & whitespace inspector](/tools/line-ending-whitespace-inspector/).

## Cause 5: interactive shell / notebook

In the Python REPL, a block must be finished by an empty line, and each body line must be indented. In Jupyter, a cell ending right after `for x in items:` gives the same error: add the body or `pass`.
