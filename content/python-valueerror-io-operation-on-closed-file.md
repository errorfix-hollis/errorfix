---
error: "ValueError: I/O operation on closed file"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 6, in <module>
      f.write("more\n")
  ValueError: I/O operation on closed file.
cat: python
description: "You read from or wrote to a file object (or StringIO, CSV writer, HTTP response) after it was closed, usually because the code is outside the `with` block that opened it."
tldr: "Move every read/write inside the `with open(...) as f:` block (check the indentation), or reopen the file. For csv writers, keep `writer.writerow()` inside the `with`. For `io.StringIO`/`BytesIO`, call `getvalue()` before closing."
keywords: python valueerror i/o operation on closed file with open indentation csv writer stringio closed file write after close flask file upload
related: [python-filenotfounderror-no-such-file-or-directory, python-indentationerror-unexpected-indent, python-unicodedecodeerror-utf-8]
---
## What it means

A file object becomes unusable once `close()` runs. Any later `read()`, `write()`, `readline()`, iteration or `seek()` raises `ValueError: I/O operation on closed file.` A `with` block closes the file automatically when the indented block ends, so the most common cause is a line that is indented one level too little.

You can check the state: `f.closed` is `True` after closing.

## Cause 1: code outside the `with` block

```python
with open("out.txt", "w") as f:
    f.write("first\n")
f.write("second\n")      # ValueError: file already closed
```

Fix: indent the code so it runs while the file is open.

```python
with open("out.txt", "w") as f:
    f.write("first\n")
    f.write("second\n")
```

If you need the data later, read it into a variable inside the block:

```python
with open("data.txt") as f:
    lines = f.readlines()
for line in lines:        # fine: works on the list, not the file
    print(line)
```

## Cause 2: csv writer/reader used after the file closed

`csv.writer` and `csv.reader` wrap the file object; they don't keep it open.

```python
import csv

with open("rows.csv", "w", newline="") as f:
    writer = csv.writer(f)
writer.writerow(["a", "b"])   # ValueError
```

Fix: do all `writerow()` calls inside the `with`:

```python
with open("rows.csv", "w", newline="") as f:
    writer = csv.writer(f)
    for row in rows:
        writer.writerow(row)
```

## Cause 3: returning a file or generator from a function

```python
def read_lines(path):
    with open(path) as f:
        return (line.strip() for line in f)   # generator runs after close

for line in read_lines("log.txt"):   # ValueError
    ...
```

Fix: either materialize the data before returning, or make the function itself a generator so the file stays open while you iterate:

```python
def read_lines(path):
    with open(path) as f:
        for line in f:
            yield line.strip()
```

## Cause 4: closing explicitly too early

A stray `f.close()` inside a loop closes the file after the first iteration:

```python
f = open("out.txt", "w")
for item in items:
    f.write(item + "\n")
    f.close()            # wrong place
```

Move `close()` after the loop, or better, use `with`.

## Cause 5: StringIO / BytesIO and libraries that close for you

`io.StringIO.getvalue()` fails once the buffer is closed. Get the value first:

```python
import io
buf = io.StringIO()
buf.write("hello")
data = buf.getvalue()
buf.close()
```

Some libraries close the stream they are given. For example `pandas.to_csv(buf)` doesn't close it, but wrapping a buffer in `io.TextIOWrapper` and letting the wrapper be garbage-collected closes the underlying buffer too. Call `wrapper.detach()` before discarding the wrapper if you still need the buffer.

In web frameworks (Flask, Django, FastAPI), an uploaded file is closed when the request ends. Read or save it during the request (`file.save(path)` or `data = await file.read()`), not in a background task that runs later.

## Cause 6: `sys.stdout` was closed or replaced

If something called `sys.stdout.close()` (or a `with` block wrapped `sys.stdout`), every later `print()` raises this error. Don't use `with sys.stdout:`; use `contextlib.redirect_stdout` to redirect output temporarily.
