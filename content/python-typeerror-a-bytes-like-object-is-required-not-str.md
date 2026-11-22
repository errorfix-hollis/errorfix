---
error: "TypeError: a bytes-like object is required, not 'str'"
error_full: |
  Traceback (most recent call last):
    File "client.py", line 7, in <module>
      sock.send("hello")
  TypeError: a bytes-like object is required, not 'str'
cat: python
description: "You passed a text string (str) to something that works on raw bytes: a socket, a file opened in binary mode, a bytes method, hashlib, or subprocess output. Encode the str, or decode the bytes."
tldr: "Convert between str and bytes explicitly: `\"hello\".encode(\"utf-8\")` gives bytes, `data.decode(\"utf-8\")` gives str. Open text files with `\"r\"`/`\"w\"` instead of `\"rb\"`/`\"wb\"`, or use `subprocess.run(..., text=True)`."
keywords: python typeerror a bytes-like object is required not str encode decode socket send rb wb binary mode hashlib subprocess check_output split replace python3
related: [python-unicodedecodeerror-utf-8, python-typeerror-can-only-concatenate-str-not-int-to-str, python-object-of-type-is-not-json-serializable]
---
## What it means

Python 3 has two separate types: `str` (Unicode text) and `bytes` (raw 8-bit data). They never convert automatically. This error means a function or operator expected `bytes` (or `bytearray`/`memoryview`) but got a `str`.

The fix is always to make both sides the same type: `str.encode()` turns text into bytes, `bytes.decode()` turns bytes into text.

## Cause 1: sending a str over a socket

```python
sock.send("hello")            # TypeError
sock.sendall("hello".encode("utf-8"))   # OK
sock.sendall(b"hello")                  # OK (bytes literal)

reply = sock.recv(4096).decode("utf-8") # bytes -> str
```

## Cause 2: file opened in binary mode

`"rb"` / `"wb"` files read and write bytes:

```python
with open("out.txt", "wb") as f:
    f.write("text")           # TypeError
```

Fix: open in text mode (and set an encoding), or encode:

```python
with open("out.txt", "w", encoding="utf-8") as f:
    f.write("text")

with open("out.bin", "wb") as f:
    f.write("text".encode("utf-8"))
```

The `csv` module in Python 3 needs text mode: `open("data.csv", "w", newline="", encoding="utf-8")`, not `"wb"` (a common leftover from Python 2 code).

## Cause 3: mixing bytes and str in string methods

Methods on a bytes object need bytes arguments:

```python
data = b"a,b,c"
data.split(",")        # TypeError
data.split(b",")       # OK
data.decode().split(",")   # OK, now works with str

if "error" in data:    # TypeError
if b"error" in data:   # OK
```

This often comes from `subprocess` or `urllib`, which return bytes.

## Cause 4: subprocess output

```python
out = subprocess.check_output(["git", "status"])
if "clean" in out:     # TypeError: out is bytes
```

Fix: ask for text output:

```python
out = subprocess.run(["git", "status"], capture_output=True, text=True).stdout
if "clean" in out:
    ...
```

`text=True` (or `encoding="utf-8"`) makes `stdout`/`stderr` str.

## Cause 5: hashing, base64, HMAC

`hashlib`, `hmac` and `base64` work on bytes:

```python
import hashlib, base64
hashlib.sha256("secret").hexdigest()            # TypeError
hashlib.sha256("secret".encode()).hexdigest()   # OK
base64.b64encode("hi".encode()).decode()        # 'aGk='
```

Need a quick hash or Base64 value to compare with? Use the [hash generator](/tools/hash-generator/) or [Base64 encoder](/tools/base64-encode-decode/).

## Which encoding?

Use `"utf-8"` unless a protocol or file says otherwise. If decoding fails with `UnicodeDecodeError`, the data isn't UTF-8; see the related page below.
