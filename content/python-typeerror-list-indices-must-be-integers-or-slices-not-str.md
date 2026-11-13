---
error: "TypeError: list indices must be integers or slices, not str"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 5, in <module>
      print(data["name"])
  TypeError: list indices must be integers or slices, not str
cat: python
description: "You indexed a list with a string key like a dict. Common with JSON responses that are a list of objects, or with input() values that are still strings."
tldr: "If the data is a list of dicts, index the list first or loop: `data[0][\"name\"]` or `for item in data: item[\"name\"]`. If the index came from `input()` or a file, convert it: `items[int(i)]`. Print `type(data)` to see what you actually have."
keywords: python typeerror list indices must be integers or slices not str json list of dicts input int index loop for item in list dictionary
related: [python-typeerror-string-indices-must-be-integers, python-indexerror-list-index-out-of-range, python-keyerror]
---
## What it means

Lists are indexed by position (`0`, `1`, `-1`) or slices (`1:3`). Writing `my_list["name"]` or `my_list["3"]` passes a string, so Python raises `TypeError`. The variable is a list even though your code treats it like a dict.

Check what you have:

```python
print(type(data), repr(data)[:200])
```

## Cause 1: JSON is a list of objects

APIs often return an array:

```json
[{"name": "Ana", "id": 1}, {"name": "Bo", "id": 2}]
```

```python
data = response.json()
data["name"]              # TypeError
```

Index into the list, or loop over it:

```python
data[0]["name"]           # first object

for user in data:
    print(user["name"])

names = [u["name"] for u in data]
```

If the JSON is nested, walk it step by step: `data["results"][0]["name"]`. Pasting it into a [JSON formatter](/tools/json-formatter/) makes the structure obvious (`[` = list, `{` = dict).

## Cause 2: index came from input(), argv, CSV or a URL

These are always strings:

```python
i = input("Which item? ")      # "2"
items[i]                       # TypeError
items[int(i)]                  # OK
```

Same for `sys.argv[1]`, `csv` cells, query parameters and environment variables.

## Cause 3: looping over a list and using the item as an index

```python
colors = ["red", "green"]
for c in colors:
    print(colors[c])    # c is "red", not 0
```

Use the item directly, or `enumerate` if you need the position:

```python
for i, c in enumerate(colors):
    print(i, c)
```

## Cause 4: you expected a dict but built a list

```python
config = []
config["debug"] = True    # TypeError
```

Use `{}` for key/value data:

```python
config = {}
config["debug"] = True
```

If you need to look up list entries by a key, build a dict once:

```python
by_id = {u["id"]: u for u in users}
by_id[2]["name"]
```

## Cause 5: float or other non-int index

`items[len(items) / 2]` gives `TypeError: list indices must be integers or slices, not float`. Use integer division: `items[len(items) // 2]`.

## Related errors

- `string indices must be integers` — same idea, but the variable is a `str` (often JSON you forgot to parse with `json.loads`). See [string indices must be integers](/python/python-typeerror-string-indices-must-be-integers/).
- `IndexError: list index out of range` — the index is an int, but too large.
