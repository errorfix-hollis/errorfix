---
error: "ValueError: Input contains NaN, infinity or a value too large for dtype('float64')."
error_full: |
  ValueError: Input contains NaN, infinity or a value too large for dtype('float64').
  ValueError: Input X contains NaN.
  LinearRegression does not accept missing values encoded as NaN natively.
cat: python
description: "scikit-learn refuses to fit or predict on data with missing values (NaN) or infinite values. Find them, then drop, impute or replace them before calling fit()."
tldr: "Find the bad values with `df.isna().sum()` and `np.isinf(df.select_dtypes('number')).sum()`. Then drop them (`df.dropna()`), replace infinities (`df.replace([np.inf, -np.inf], np.nan)`), or impute with `sklearn.impute.SimpleImputer` inside a Pipeline."
keywords: python sklearn valueerror input contains nan infinity or a value too large for dtype float64 input x contains nan missing values simpleimputer dropna fillna isinf scikit-learn fit
related: [python-valueerror-expected-2d-array-got-1d-array, python-valueerror-could-not-convert-string-to-float, python-pandas-settingwithcopywarning]
---
## What it means

Most scikit-learn estimators (LinearRegression, SVC, KMeans, LogisticRegression, ...) validate their input with `check_array`. If the array contains `NaN`, `inf`/`-inf`, or numbers too large for float64, they raise this error. Newer versions are more specific: `Input X contains NaN.` or `Input y contains infinity`.

Note whether it says `X` or `y`: the target column can contain NaN too.

## Step 1: find the bad values

```python
import numpy as np
import pandas as pd

print(df.isna().sum())                                  # NaN per column
num = df.select_dtypes("number")
print(np.isinf(num).sum())                              # inf per column
print(num.abs().max())                                  # suspiciously huge values
```

For a NumPy array: `np.isnan(X).sum()`, `np.isinf(X).sum()`.

## Fix 1: drop rows with missing values

Simple, fine when only a few rows are affected. Drop from X and y together so they stay aligned:

```python
data = df[features + [target]].replace([np.inf, -np.inf], np.nan).dropna()
X, y = data[features], data[target]
```

Dropping only from `X` leads to `Found input variables with inconsistent numbers of samples`.

## Fix 2: impute instead of dropping

Fill missing values with the mean/median/most frequent value. Use a Pipeline so the same imputation is learned on the training set and applied to test data:

```python
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression

model = make_pipeline(SimpleImputer(strategy="median"), LinearRegression())
model.fit(X_train, y_train)
model.predict(X_test)
```

For mixed numeric and categorical columns, use a `ColumnTransformer` with `SimpleImputer(strategy="most_frequent")` for the categorical ones.

## Fix 3: infinity from your own feature engineering

Divisions like `df["ratio"] = df.a / df.b` produce `inf` where `b == 0`, and `np.log(0)` gives `-inf`. Replace them:

```python
df["ratio"] = (df.a / df.b).replace([np.inf, -np.inf], np.nan)
df["log_x"] = np.log1p(df.x)     # safe for x >= 0
```

## Fix 4: NaN appeared after a transformation

Common sources:

- `pd.to_numeric(col, errors="coerce")` turns unparseable strings into NaN.
- `merge`/`join` with no match fills NaN.
- `shift()`, `rolling()` and `pct_change()` leave NaN in the first rows.

Check `isna().sum()` right before `fit()`, not just after loading.

## Fix 5: use a model that accepts NaN

`HistGradientBoostingClassifier`/`Regressor` handle missing values natively, as do XGBoost and LightGBM. Infinity is still not allowed, so replace it with NaN first.

## Value too large for dtype

If there are no NaN/inf but huge values (e.g. `1e308`), scale or clip them: `np.clip(X, -1e10, 1e10)`, or check for unit/parsing errors in the column.
