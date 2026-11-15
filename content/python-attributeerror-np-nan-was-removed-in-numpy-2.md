---
error: "AttributeError: `np.NaN` was removed in the NumPy 2.0 release. Use `np.nan` instead."
error_full: |
  Traceback (most recent call last):
    File "clean.py", line 4, in <module>
      df = df.replace("", np.NaN)
                          ^^^^^^
    File ".../numpy/__init__.py", line 397, in __getattr__
      raise AttributeError(
  AttributeError: `np.NaN` was removed in the NumPy 2.0 release. Use `np.nan` instead.
cat: python
description: "NumPy 2.0 removed many old aliases (np.NaN, np.NAN, np.Inf, np.float_, np.unicode_ ...). Code or a library written for NumPy 1.x still uses them."
tldr: "In your code, replace the alias: `np.NaN`/`np.NAN` → `np.nan`, `np.Inf`/`np.Infinity`/`np.infty` → `np.inf`, `np.float_` → `np.float64`, `np.complex_` → `np.complex128`, `np.unicode_` → `np.str_`, `np.string_` → `np.bytes_`. `ruff check --select NPY201 --fix` does it automatically. If a third-party library raises it, upgrade that library, or pin `numpy<2` until it's fixed."
keywords: numpy 2.0 np.nan was removed attributeerror np.NaN np.float_ np.Inf np.unicode_ np.string_ np.complex_ use np.nan instead ruff npy201 numpy<2 pin
related: [python-numpy-module-compiled-using-numpy-1x-cannot-be-run-in-numpy-2, python-attributeerror-module-has-no-attribute, python-modulenotfounderror-no-module-named-numpy]
---
## What it means

NumPy 2.0 (June 2024) cleaned up its main namespace and removed about a hundred redundant aliases. Accessing one now raises an `AttributeError` that names the replacement. The behaviour is identical after you switch, because the aliases pointed at the same objects.

Check your version:

```bash
python -c "import numpy; print(numpy.__version__)"
```

## Fix 1: replace the removed names

| Removed in 2.0 | Use instead |
|---|---|
| `np.NaN`, `np.NAN` | `np.nan` |
| `np.Inf`, `np.Infinity`, `np.infty`, `np.PINF` | `np.inf` |
| `np.NINF` | `-np.inf` |
| `np.PZERO` / `np.NZERO` | `0.0` / `-0.0` |
| `np.float_` | `np.float64` |
| `np.complex_`, `np.cfloat` | `np.complex128` |
| `np.longfloat` | `np.longdouble` |
| `np.singlecomplex` | `np.complex64` |
| `np.unicode_` | `np.str_` |
| `np.string_` | `np.bytes_` |
| `np.product`, `np.cumproduct` | `np.prod`, `np.cumprod` |
| `np.alltrue`, `np.sometrue` | `np.all`, `np.any` |
| `np.round_` | `np.round` |
| `np.asfarray(x)` | `np.asarray(x, dtype=np.float64)` |
| `np.cast[dtype](x)` | `np.asarray(x, dtype=dtype)` |
| `np.find_common_type` | `np.result_type` / `np.promote_types` |

The plain builtins `np.float`, `np.int`, `np.bool`, `np.object` were already removed in 1.24. Use `float`, `int`, `bool`, `object`. Note that `np.bool` was *added back* in 2.0 as an alias for `np.bool_`.

Quick search for removed names in your project:

```bash
grep -rnE "np\.(NaN|NAN|Inf|Infinity|infty|NINF|PINF|float_|complex_|unicode_|string_)\b" --include=*.py .
```

## Fix 2: let ruff rewrite it

Ruff has a rule just for this migration:

```bash
python -m pip install ruff
ruff check --select NPY201 --fix .
```

It rewrites removed aliases and flags the cases it can't fix automatically.

## Fix 3: the error comes from a library

If the traceback ends inside `site-packages/<somelib>/`, that library hasn't been updated for NumPy 2. Upgrade it first:

```bash
python -m pip install -U <somelib>
```

If no fixed release exists, pin NumPy 1.x in that environment:

```bash
python -m pip install "numpy<2"
```

Add the pin to `requirements.txt` (`numpy<2`) and check back later. Libraries built against NumPy 1.x can also fail at import with a different error, [A module that was compiled using NumPy 1.x cannot be run in NumPy 2](/python/python-numpy-module-compiled-using-numpy-1x-cannot-be-run-in-numpy-2/). The same upgrade-or-pin choice applies.

## Fix 4: code that must support both 1.x and 2.x

All the replacements above (`np.nan`, `np.inf`, `np.float64`, `np.str_`, `np.bytes_`...) already exist in NumPy 1.x. Switching to them works on both versions, so there's no need for version checks.

## pandas users

`df.replace("", np.NaN)` and `df.fillna(np.NaN)` are the most common triggers. Use `np.nan`, or `pd.NA` for nullable dtypes. pandas itself supports NumPy 2 from pandas 2.2.2.
