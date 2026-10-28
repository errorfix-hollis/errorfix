---
error: "TypeError: unsupported operand type(s) for +: 'int' and 'str'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 3, in <module>
      total = count + input("More: ")
  TypeError: unsupported operand type(s) for +: 'int' and 'str'
cat: python
description: You used an operator (+, -, *, /) between two types that don't support it together, usually a number and a string (input() always returns a string) or a value that is None.
tldr: "Convert to the same type first: `int(x)` / `float(x)` for math, `str(x)` or an f-string for text: `f\"Total: {count}\"`. If one side is `NoneType`, a function returned None; check its return statement."
keywords: python typeerror unsupported operand type for + int and str nonetype can only concatenate str not int input conversion
related: [python-typeerror-nonetype-object-is-not-subscriptable, python-valueerror-too-many-values-to-unpack]
---
## What it means

Python doesn't convert types implicitly. `1 + "2"` is an error, not `3` or `"12"`. The message tells you which operator and which two types were involved.

## Cause 1: `input()` returns a string

```python
age = input("Age: ")
print(age + 1)            # TypeError
```

```python
age = int(input("Age: "))
print(age + 1)
```

Use `float()` for decimals. Wrap it in `try/except ValueError` if the user may type something that isn't a number.

## Cause 2: building a string from numbers

```python
print("Total: " + total)          # can only concatenate str (not "int") to str
```

```python
print(f"Total: {total}")
print("Total: " + str(total))
```

## Cause 3: one side is `None`

`unsupported operand type(s) for +: 'NoneType' and 'int'` means a variable is `None`. Usually a function without a `return`:

```python
def price(item):
    item["price"] * 1.2      # missing return

total = price(x) + 5
```

Add `return`. Also check dict `.get()` calls that return `None` for missing keys; give a default: `d.get("count", 0)`.

## Cause 4: data read from files, CSV, JSON or the web

Everything from `csv`, environment variables, query strings and form data arrives as strings. Convert as you read:

```python
for row in csv.DictReader(f):
    qty = int(row["qty"])
```

In pandas, `df["col"] = pd.to_numeric(df["col"], errors="coerce")`.

## Cause 5: lists and numbers

`[1, 2] + 3` fails; use `append` or `[1, 2] + [3]`. For element-wise math, use NumPy arrays.
