---
error: "ValueError: not enough values to unpack (expected 2, got 1)"
error_full: |
  Traceback (most recent call last):
    File "parse.py", line 4, in <module>
      key, value = line.split("=")
  ValueError: not enough values to unpack (expected 2, got 1)
cat: python
description: "You unpacked an iterable into more variables than it has items, e.g. a, b = something that only contains one value. Common with str.split on lines that lack the separator, and with dict iteration or function returns."
tldr: "Make the right side produce exactly as many items as names: use `key, sep, value = line.partition(\"=\")` or `line.split(\"=\", 1)` and skip lines without the separator, loop dicts with `.items()`, and check what the function really returns with `print(repr(x))`. Use `a, *rest = x` when the length varies."
keywords: valueerror not enough values to unpack expected 2 got 1 expected 3 got 2 got 0 split partition dict items for loop tuple unpacking python
related: [python-valueerror-too-many-values-to-unpack, python-indexerror-list-index-out-of-range, python-typeerror-nonetype-object-is-not-iterable]
---
## What it means

Tuple unpacking assigns each item of an iterable to a name:

```python
a, b = [1, 2]     # fine
a, b = [1]        # ValueError: not enough values to unpack (expected 2, got 1)
a, b = []         # (expected 2, got 0)
a, b = "x"        # (expected 2, got 1) - strings unpack per character
```

"expected" is the number of names on the left, "got" is how many items the right side had. The opposite problem is [too many values to unpack](/python/python-valueerror-too-many-values-to-unpack/).

## Cause 1: `split()` on a line without the separator

The classic case — parsing `key=value` lines when one line is blank, a comment, or malformed:

```python
for line in open("config.txt"):
    key, value = line.strip().split("=")   # blank line -> [''] -> got 1
```

Skip or handle those lines, and limit the split so values containing `=` don't cause the opposite error:

```python
for line in open("config.txt"):
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
```

`str.partition` always returns 3 items, so it never raises:

```python
key, sep, value = line.partition("=")
if not sep:
    continue          # no '=' in the line
```

For CSV data use the `csv` module instead of `split(",")` — it handles quoted commas.

## Cause 2: iterating a dict without `.items()`

```python
scores = {"ann": 90, "bob": 85}
for name, score in scores:       # iterates keys: 'ann' -> unpack 3 chars into 2 names
    ...
```

With 2-character keys this "works" by accident; with 1-character keys you get *not enough*, otherwise *too many*. Use:

```python
for name, score in scores.items():
    ...
```

## Cause 3: a function returns fewer values than you think

```python
def find_user(uid):
    if uid not in users:
        return None              # caller expects (name, email)
    return users[uid].name, users[uid].email

name, email = find_user(42)      # TypeError: cannot unpack non-iterable NoneType object
```

When a function returns a single string or a one-element list, you get this ValueError instead. Make every return path return the same shape, or check before unpacking:

```python
result = find_user(42)
if result is None:
    ...
name, email = result
```

Debug with `print(repr(result))` right before the unpacking line.

## Cause 4: library API returned a different shape

Examples you'll meet:

- **OpenCV 3 vs 4**: `cv2.findContours` returns 3 values in OpenCV 3 and 2 in OpenCV 4. Version-proof: `contours = cv2.findContours(img, mode, method)[-2]`.
- **`enumerate`** gives pairs: `for i, (x, y) in enumerate(points)` — forgetting the inner parentheses causes unpack errors.
- **`zip` / `dict.items()`** yield pairs; **`os.walk`** yields triples `(root, dirs, files)`.
- **PyTorch/Keras**: a dataset that returns only inputs when the loop expects `inputs, labels`.

## Cause 5: variable-length data

If the number of items legitimately varies, use star-unpacking to collect the rest:

```python
first, *rest = parts            # works for 1 or more items
first, *_, last = parts         # needs at least 2
```

Or check the length explicitly:

```python
if len(parts) != 2:
    raise ValueError(f"bad line: {line!r}")
```
