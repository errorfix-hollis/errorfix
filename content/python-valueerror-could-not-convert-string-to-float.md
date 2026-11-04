---
error: "ValueError: could not convert string to float"
error_full: |
  ValueError: could not convert string to float: ''
  ValueError: could not convert string to float: '1,234.50'
cat: python
description: "`float()` got a string that isn't a valid number: empty, contains commas, currency symbols, units, or stray whitespace characters. The value in quotes in the message is the exact offending string."
tldr: "Look at the quoted value in the message. Clean it before converting: `float(s.strip().replace(',', ''))`, skip empty strings, or in pandas use `pd.to_numeric(df['col'], errors='coerce')` to turn bad values into NaN."
keywords: python valueerror could not convert string to float empty string comma pandas to_numeric errors coerce csv input float() decimal separator
related: [python-valueerror-invalid-literal-for-int-with-base-10, python-typeerror-can-only-concatenate-str-not-int-to-str, python-typeerror-unsupported-operand-types]
---
## What it means

`float(x)` accepts strings like `"3.14"`, `" 42 "`, `"1e-5"`, `"inf"` and `"nan"`. Anything else raises this error, and the message shows the repr of the bad string:

```python
float("")          # could not convert string to float: ''
float("1,234.5")   # could not convert string to float: '1,234.5'
float("$9.99")     # could not convert string to float: '$9.99'
float("3,5")       # European decimal comma
```

Read the quoted part carefully: `'12.5\xa0'` (non-breaking space) or `'12.5\n'` hidden inside data look like valid numbers when printed normally.

## Cause 1: empty strings

Blank CSV cells, empty form fields, or a trailing newline split into an empty line.

```python
value = row["price"].strip()
price = float(value) if value else None
```

## Cause 2: thousands separators, currency, units, percent

```python
import re

def parse_number(s: str) -> float:
    s = s.strip().replace(",", "")      # 1,234.50 -> 1234.50
    s = re.sub(r"[^\d.eE+-]", "", s)    # drop $, %, kg, spaces
    return float(s)

parse_number("$1,234.50")   # 1234.5
parse_number("45 %")        # 45.0
```

Be careful: stripping characters blindly can hide genuinely bad data. Log values you had to clean.

## Cause 3: decimal comma (locale formats)

`"3,5"` means 3.5 in much of Europe. Either replace the comma:

```python
float("3,5".replace(",", "."))
```

or, for mixed formats like `"1.234,56"`, remove the dots first, then replace the comma. When reading CSVs with pandas, tell it the format:

```python
pd.read_csv("data.csv", decimal=",", thousands=".")
```

## Cause 4: header row or text in a numeric column

Reading a CSV manually and converting the header line (`"price"`) fails. Skip it:

```python
import csv
with open("data.csv", newline="") as f:
    for row in csv.DictReader(f):
        total += float(row["price"])
```

## Fix in pandas

`df["col"].astype(float)` fails on the first bad value. To find and handle them:

```python
import pandas as pd

nums = pd.to_numeric(df["price"], errors="coerce")   # bad values -> NaN
print(df.loc[nums.isna() & df["price"].notna(), "price"].unique())  # what failed
df["price"] = nums
```

To clean common formatting first:

```python
df["price"] = pd.to_numeric(
    df["price"].astype(str).str.replace(r"[$,\s]", "", regex=True),
    errors="coerce",
)
```

## Fix for user input

Wrap the conversion and ask again:

```python
while True:
    try:
        amount = float(input("Amount: "))
        break
    except ValueError:
        print("Please enter a number like 12.5")
```

## Related: int()

`int("3.7")` fails with `invalid literal for int() with base 10`. Use `int(float("3.7"))` if you want to truncate, or `round(float(s))`.
