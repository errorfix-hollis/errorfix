---
error: "AttributeError: 'list' object has no attribute"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 5, in <module>
      names.split(",")
  AttributeError: 'list' object has no attribute 'split'
cat: python
description: "You called a method on a list that lists don't have — usually a string, dict, NumPy or pandas method — because the variable holds a list when you expected a single item or another type."
tldr: "Print `type(x)` to see what you actually have. Apply the method to each element (`[s.split(',') for s in names]`), pick one element (`names[0].split(',')`), or use the list equivalent (`append` not `add`/`push`, `len(x)` not `x.length`, `' '.join(x)` not `x.join()`). For `.shape`/`.reshape` convert with `np.array(x)`."
keywords: attributeerror list object has no attribute split lower strip append add push items keys shape reshape replace get python list method error
related: [python-attributeerror-str-object-has-no-attribute, python-attributeerror-nonetype-object-has-no-attribute, python-attributeerror-module-has-no-attribute]
---
## What it means

The object on the left of the dot is a `list`, and lists only have these methods: `append`, `extend`, `insert`, `remove`, `pop`, `clear`, `index`, `count`, `sort`, `reverse`, `copy`. Anything else — `split`, `lower`, `items`, `shape`, `add`, `push`, `length` — raises this error.

The fix depends on whether the variable *should* be a list.

## Cause 1: string method on a list of strings

```python
lines = f.readlines()          # list of strings
lines.strip()                  # 'list' object has no attribute 'strip'
```

Apply it to each element:

```python
lines = [line.strip() for line in lines]

# or read differently
text = f.read()                # one string
lines = text.splitlines()
```

Same for `lower`, `upper`, `replace`, `split`, `startswith`, `encode`:

```python
words = ["Apple", "Banana"]
lower = [w.lower() for w in words]
```

If you only want the first item, index it: `words[0].lower()`.

## Cause 2: methods from other languages or other types

| You wrote | Python list equivalent |
|---|---|
| `x.push(v)` / `x.add(v)` | `x.append(v)` (`add` is for sets) |
| `x.length` / `x.size()` | `len(x)` |
| `x.join(", ")` | `", ".join(x)` (join is a string method) |
| `x.contains(v)` | `v in x` |
| `x.find(v)` | `x.index(v)` (raises if missing) |
| `x.isEmpty()` | `not x` |
| `x.items()` / `x.keys()` | it's not a dict — see Cause 3 |

## Cause 3: you expected a dict but got a list (JSON)

APIs often return a list of objects:

```python
data = response.json()          # [{"id": 1, ...}, {"id": 2, ...}]
data.get("id")                  # 'list' object has no attribute 'get'
```

Loop over it, or index the element you need:

```python
for item in data:
    print(item.get("id"))

first_id = data[0]["id"]
```

Inspect the shape first: `print(type(data), len(data))` or paste the response into the [JSON formatter](/tools/json-formatter/).

## Cause 4: NumPy / pandas attributes on a plain list

```python
values = [1, 2, 3]
values.shape        # AttributeError
values.mean()       # AttributeError
```

Convert first:

```python
import numpy as np
arr = np.array(values)
arr.shape, arr.mean()

import pandas as pd
s = pd.Series(values)
s.mean()
```

Some functions return lists even when given arrays — e.g. `arr.tolist()`, `sorted(arr)`, `list(df.columns)`. `sorted()` always returns a list; use `np.sort()` to stay in NumPy.

## Cause 5: a function returned a list instead of an object

Selenium's `find_elements` (plural) returns a list; `find_element` returns one element:

```python
driver.find_elements(By.ID, "q").send_keys("x")   # 'list' object has no attribute 'send_keys'
driver.find_element(By.ID, "q").send_keys("x")    # OK
```

BeautifulSoup's `find_all` vs `find`, and `re.findall` vs `re.search`, behave the same way.

## Cause 6: the variable was reassigned

```python
result = MyObject()
...
result = []                  # overwritten later in the function
result.process()             # AttributeError
```

Search for every assignment to the variable and give different values different names.
