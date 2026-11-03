---
error: "TypeError: can only concatenate str (not \"int\") to str"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 2, in <module>
      print("Age: " + age)
  TypeError: can only concatenate str (not "int") to str
cat: python
description: You used + to join a string with a number (or other non-string). Python won't convert types implicitly; format the value or convert it with str().
tldr: "Use an f-string: `f\"Age: {age}\"`, or convert explicitly: `\"Age: \" + str(age)`. If you meant arithmetic, convert the string to a number instead: `int(s) + 1`."
keywords: python typeerror can only concatenate str not int to str float list nonetype f-string str() concatenation input
related: [python-typeerror-unsupported-operand-types, python-valueerror-invalid-literal-for-int-with-base-10, python-typeerror-str-object-is-not-callable]
---
## What it means

`+` between two strings concatenates them. If the left side is a `str` and the right side is an `int`, `float`, `list`, `NoneType`, etc., Python raises this error rather than guessing what you meant. The type in quotes tells you what the right-hand operand was:

```
can only concatenate str (not "int") to str
can only concatenate str (not "NoneType") to str
can only concatenate str (not "list") to str
```

If the number is on the *left* (`5 + "a"`) you get `unsupported operand type(s) for +: 'int' and 'str'` instead — same problem.

## Fix 1: use an f-string (recommended)

```python
age = 30
print(f"Age: {age}")
msg = f"{name} has {count} items costing {price:.2f}"
```

f-strings call `format()` on each value, so any type works, and you get formatting options like `:.2f`, `:,` and `:>10`.

## Fix 2: convert with str()

```python
print("Age: " + str(age))
```

Or let `print` do it: `print("Age:", age)` (comma-separated arguments are converted and joined with spaces).

## Fix 3: you wanted arithmetic, not text

Values from `input()`, files, `sys.argv`, environment variables and web forms are always strings:

```python
n = input("Number: ")
print(n + 1)        # TypeError
print(int(n) + 1)   # correct
```

## Fix 4: joining a list

```python
parts = ["a", "b"]
"prefix: " + parts            # (not "list")
"prefix: " + ", ".join(parts)  # 'prefix: a, b'

nums = [1, 2, 3]
", ".join(nums)                     # TypeError: expected str instance, int found
", ".join(str(n) for n in nums)     # '1, 2, 3'
```

## Fix 5: (not "NoneType")

A variable you thought was a string is `None` — often a function with no `return`, `dict.get()` on a missing key, or `os.environ.get("VAR")` when the variable isn't set:

```python
home = os.environ.get("APP_HOME")
path = home + "/config"     # (not "NoneType")
```

Give a default or fail clearly:

```python
home = os.environ.get("APP_HOME", "/opt/app")
# or
home = os.environ["APP_HOME"]   # KeyError names the missing variable
```

For filesystem paths, prefer `pathlib`: `Path(home) / "config"`.

## Fix 6: building strings in a loop

```python
out = ""
for i in range(3):
    out += str(i)        # not out += i
```

For many pieces, collecting into a list and calling `"".join(...)` at the end is faster.
