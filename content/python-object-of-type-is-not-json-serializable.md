---
error: "TypeError: Object of type X is not JSON serializable"
error_full: |
  TypeError: Object of type datetime is not JSON serializable
  TypeError: Object of type Decimal is not JSON serializable
  TypeError: Object of type ndarray is not JSON serializable
cat: python
description: "`json.dumps` only knows dict, list, str, int, float, bool and None. Anything else (datetime, Decimal, set, numpy types, your own classes) must be converted first."
tldr: "Convert the value before dumping, or pass a fallback: `json.dumps(data, default=str)`. For more control write a `default` function that handles `datetime` (`.isoformat()`), `Decimal` (`float`/`str`), `set` (`list`) and numpy (`.tolist()` / `.item()`)."
keywords: python typeerror object of type is not json serializable datetime decimal set ndarray int64 json.dumps default jsonencoder dataclass flask fastapi django
related: [python-unicodedecodeerror-utf-8, python-keyerror, python-typeerror-string-indices-must-be-integers]
---
## What it means

Python's `json` module maps a fixed set of types to JSON:

| Python | JSON |
|---|---|
| dict | object |
| list, tuple | array |
| str | string |
| int, float | number |
| True / False / None | true / false / null |

Anything else raises `TypeError: Object of type <name> is not JSON serializable`. The type name in the message tells you exactly which value to convert.

## Fix 1: quick fallback with `default=str`

```python
import json, datetime
data = {"created": datetime.datetime.now()}
json.dumps(data, default=str)
# '{"created": "2026-11-04 09:30:00.123456"}'
```

`default` is called for every object `json` can't handle. `str` is fine for logs and debugging, but it turns everything into strings.

## Fix 2: a proper `default` function

```python
import json, datetime, decimal, uuid, dataclasses

def to_json(o):
    if isinstance(o, (datetime.datetime, datetime.date, datetime.time)):
        return o.isoformat()
    if isinstance(o, decimal.Decimal):
        return float(o)          # or str(o) to keep exact precision
    if isinstance(o, (set, frozenset)):
        return list(o)
    if isinstance(o, uuid.UUID):
        return str(o)
    if dataclasses.is_dataclass(o):
        return dataclasses.asdict(o)
    raise TypeError(f"Object of type {type(o).__name__} is not JSON serializable")

json.dumps(data, default=to_json)
```

Or subclass `json.JSONEncoder` and pass `cls=MyEncoder`; both work the same way.

## Cause: NumPy and pandas types

`numpy.int64`, `numpy.float32` and `ndarray` are not Python ints/floats/lists. They often sneak in from `df["col"].sum()` or `arr.max()`.

```python
import numpy as np
json.dumps({"n": np.int64(3)})            # TypeError: Object of type int64 ...

json.dumps({"n": np.int64(3).item()})     # convert scalar
json.dumps({"a": arr.tolist()})           # convert array
```

For DataFrames use pandas' own serializer, which handles timestamps and NaN:

```python
df.to_json(orient="records", date_format="iso")
```

## Cause: your own class

```python
class User:
    def __init__(self, name): self.name = name

json.dumps(User("ann"))   # TypeError: Object of type User ...
```

Return a dict explicitly (`json.dumps(vars(user))`), make it a `@dataclass` and use `dataclasses.asdict`, or with Pydantic v2 use `user.model_dump_json()` / `user.model_dump(mode="json")`.

## Cause: bytes

`bytes` aren't JSON. Decode text (`b.decode("utf-8")`) or base64-encode binary data:

```python
import base64
base64.b64encode(raw).decode("ascii")
```

## In web frameworks

- **Flask**: `jsonify` handles dates in recent versions; for other types set a custom provider (`app.json = MyJSONProvider(app)` with a `default` method).
- **FastAPI**: return Pydantic models or use `fastapi.encoders.jsonable_encoder(obj)`.
- **Django**: use `django.core.serializers.json.DjangoJSONEncoder` (handles datetime, Decimal, UUID): `json.dumps(data, cls=DjangoJSONEncoder)`.
