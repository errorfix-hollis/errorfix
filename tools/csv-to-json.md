---
name: "CSV ↔ JSON converter"
title: "CSV to JSON Converter (and JSON to CSV) — handles quotes, semicolons, newlines"
h1: "CSV to JSON and JSON to CSV converter"
description: "Convert CSV to JSON and JSON to CSV in your browser. RFC 4180 parsing with quoted fields, escaped quotes and line breaks, delimiter auto-detection (comma, semicolon, tab, pipe), header row and number/boolean type inference."
intro: "Paste CSV or JSON, or open a file, and convert in either direction. Detects comma, semicolon, tab and pipe delimiters, handles quoted fields with commas and line breaks, and flattens nested JSON objects into columns."
order: 18
js: csv
keywords: "csv to json json to csv convert csv to json online csv parser tsv to json semicolon csv excel csv json array of objects to csv rfc 4180"
related: [python-unicodedecodeerror-utf-8, python-jsondecodeerror-expecting-value, js-unexpected-token-in-json, python-object-of-type-is-not-json-serializable]
---
## CSV rules (RFC 4180) in short

- Fields are separated by the delimiter, and records by line breaks (CRLF, LF or CR).
- A field that contains the delimiter, a double quote or a line break **must be quoted**: `"Smith, Anna"`.
- A double quote inside a quoted field is written twice: `"He said ""hi"""` means `He said "hi"`.
- Spaces count as part of the field. `a, b` gives `" b"` with a leading space, which is why converters quote fields that start or end with a space.

## Common surprises

| Problem | Cause | Fix |
|---|---|---|
| Everything is in one column | Excel in many European locales saves CSV with **semicolons**, because the comma is the decimal separator | auto-detect, or choose `;` |
| `Ã©` instead of `é` | the file is Windows-1252 or Latin-1, not UTF-8 | re-save as UTF-8; in Python use `open(f, encoding="cp1252")` (see [UnicodeDecodeError](/python/python-unicodedecodeerror-utf-8/)) |
| `ï»¿id` as the first header | a UTF-8 byte order mark | stripped automatically here; in Python use `encoding="utf-8-sig"` |
| Zip codes lose their leading zero | type inference turned `007` into a number | this tool keeps numbers with leading zeros as strings, or untick inference |
| Rows split in the middle | an unescaped quote or an unclosed quoted field | check the warnings list |

## JSON to CSV

The input should be an array of objects (`[{"id":1}, …]`) or an array of arrays. The columns are the union of all keys, in the order they first appear, so objects with missing keys just get empty cells. Nested objects become dotted columns (`address.city`), and arrays are written as JSON text inside the cell. If you have an object like `{"items": [...]}`, the converter uses the array inside it.

In code: Python's `csv.DictReader` plus `json.dumps`, or `pandas.read_csv(...).to_json(orient="records")`. If the JSON side fails to parse, see [JSONDecodeError: Expecting value](/python/python-jsondecodeerror-expecting-value/) and [Unexpected token in JSON](/javascript/js-unexpected-token-in-json/).
