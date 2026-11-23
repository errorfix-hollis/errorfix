---
error: "ValueError: Found input variables with inconsistent numbers of samples"
error_full: |
  Traceback (most recent call last):
    File "train.py", line 14, in <module>
      X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
  ValueError: Found input variables with inconsistent numbers of samples: [800, 1000]
cat: python
description: "scikit-learn received X and y (or y_true and y_pred) with different numbers of rows. The two numbers in brackets are the row counts it found."
tldr: "Check `X.shape` and `y.shape` (or `len(...)`) right before the call; the first dimension must match. Common fixes: drop NaNs from X and y together (`df = df.dropna(); X = df[features]; y = df[target]`), don't transpose X, use `y_test` (not `y_train`) when scoring `model.predict(X_test)`, and pass a 1-D column with `df[\"target\"]` rather than a row."
keywords: sklearn valueerror found input variables with inconsistent numbers of samples train_test_split fit accuracy_score shape mismatch X y dropna reshape transpose scikit-learn
related: [python-valueerror-expected-2d-array-got-1d-array, python-valueerror-input-contains-nan, python-modulenotfounderror-no-module-named-sklearn]
---
## What it means

Every sklearn function that takes several arrays (`fit`, `train_test_split`, `cross_val_score`, `accuracy_score`, `mean_squared_error`...) calls `check_consistent_length`, which requires the same number of samples (rows) in each. `[800, 1000]` means one input has 800 rows and the other 1000.

Start by printing shapes right before the failing line:

```python
print(X.shape, y.shape)
```

## Cause 1: rows removed from X but not y

```python
X = df[["age", "income"]].dropna()     # 800 rows
y = df["bought"]                       # 1000 rows
model.fit(X, y)                        # error
```

Clean the DataFrame first, then split into X and y so they stay aligned:

```python
df = df.dropna(subset=["age", "income", "bought"])
X = df[["age", "income"]]
y = df["bought"]
```

The same goes for filtering (`df[df.age > 18]`), deduplication and outlier removal: apply them to the whole DataFrame, or use the same boolean mask on both.

## Cause 2: comparing predictions with the wrong labels

```python
model.fit(X_train, y_train)
pred = model.predict(X_test)
accuracy_score(y_train, pred)      # error: train labels vs test predictions
```

Use the matching set:

```python
accuracy_score(y_test, pred)
```

Also check the unpacking order of `train_test_split`: it returns `X_train, X_test, y_train, y_test` (all X parts first, then all y parts).

## Cause 3: X is transposed or reshaped wrongly

sklearn expects X as `(n_samples, n_features)`. If you build it from lists of columns, it ends up `(n_features, n_samples)`:

```python
import numpy as np
X = np.array([ages, incomes])     # shape (2, 1000) — wrong
X = np.column_stack([ages, incomes])  # shape (1000, 2) — right
```

A single feature must be 2-D: `X = df[["age"]]` or `x.reshape(-1, 1)`. Using `reshape(1, -1)` makes 1 sample with N features and triggers this error (see [Expected 2D array, got 1D array](/python/python-valueerror-expected-2d-array-got-1d-array/)).

## Cause 4: target selected as a row or the whole DataFrame

```python
y = df.loc["bought"]     # a row label, not a column
y = df.iloc[0]           # first row
```

Select the column:

```python
y = df["bought"]
```

## Cause 5: text features with vectorizers

When fitting a `CountVectorizer`/`TfidfVectorizer`, pass a 1-D sequence of strings. Passing a DataFrame (`df[["text"]]`) makes the vectorizer iterate over column names, giving 1 sample:

```python
vec = TfidfVectorizer()
X = vec.fit_transform(df["text"])   # not df[["text"]]
```

And transform the test set with the fitted vectorizer: `vec.transform(test_df["text"])`.

## Cause 6: reading files that differ in length

Features and labels loaded from separate files (CSV, images folder, labels file) can be off because of a header row, a trailing blank line or a missing file. Compare lengths after loading, and prefer joining on an ID column over relying on row order.
