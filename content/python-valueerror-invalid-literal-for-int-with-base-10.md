---
error: "ValueError: invalid literal for int() with base 10"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 2, in <module>
      age = int(value)
  ValueError: invalid literal for int() with base 10: '12.5'
cat: python
description: int() was given a string that isn't a plain whole number — e.g. a decimal, an empty string, whitespace-padded text with junk, or a header row. The value after the colon shows exactly what it got.
tldr: "Look at the quoted value in the message. For decimals use `int(float(s))`; strip whitespace with `s.strip()`; skip empty strings and header rows; or wrap in `try: int(s) except ValueError:` to handle bad input."
keywords: python valueerror invalid literal for int with base 10 empty string float decimal input csv header strip newline convert string to int
related: [python-typeerror-unsupported-operand-types, python-typeerror-str-object-is-not-callable, python-unicodedecodeerror-utf-8]
---
## What it means

`int("42")` works. `int()` with a string only accepts optional whitespace, an optional sign, and digits (underscores between digits are allowed, e.g. `"1_000"`). Anything else raises `ValueError`, and the message ends with `repr()` of the bad input. That quoted value is the key to the fix:

| Message ends with | Problem |
|---|---|
| `''` | empty string |
| `'12.5'` | decimal number |
| `'1,000'` | thousands separator |
| `'age'` | header row / label |
| `'0x1f'` | hex, needs a base |
| `'42abc'` | trailing junk |

## Cause 1: the string is a decimal

```python
int("12.5")          # ValueError
int(float("12.5"))   # 12 (truncates toward zero)
round(float("12.5")) # 12 (banker's rounding)
```

For money or exact values use `decimal.Decimal("12.5")`.

## Cause 2: empty string

Common with `input()` when the user presses Enter, blank CSV cells, or `line.split(",")` on a trailing comma.

```python
s = s.strip()
n = int(s) if s else 0
```

## Cause 3: header row or labels in a file

```python
with open("data.csv") as f:
    for line in f:
        total += int(line.split(",")[1])   # first line is "name,age"
```

Skip the header, or use the `csv` module:

```python
import csv
with open("data.csv", newline="") as f:
    reader = csv.DictReader(f)
    total = sum(int(row["age"]) for row in reader if row["age"].strip())
```

## Cause 4: formatted numbers

```python
int("1,000".replace(",", ""))   # 1000
int("$25".lstrip("$"))          # 25
```

For locale-aware parsing (`"1.234,5"`), use `locale.atof` after `locale.setlocale`, or `babel.numbers.parse_decimal`.

## Cause 5: other bases

```python
int("0x1f", 16)   # 31
int("0x1f", 0)    # 31, base inferred from prefix
int("1010", 2)    # 10
```

## Cause 6: hidden characters

Newlines are fine (`int("5\n")` works), but a BOM, non-breaking space or `\x00` is not. Print with `repr()` to see them:

```python
print(repr(s))    # '\ufeff42'
```

Open the file with `encoding="utf-8-sig"` to drop a BOM.

## Handling user input robustly

```python
def to_int(s, default=None):
    try:
        return int(s)
    except (TypeError, ValueError):
        return default

while True:
    try:
        age = int(input("Age: "))
        break
    except ValueError:
        print("Please enter a whole number.")
```

In pandas, use `pd.to_numeric(df["col"], errors="coerce")` to turn bad values into `NaN` instead of crashing.
