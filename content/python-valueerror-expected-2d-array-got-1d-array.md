---
error: "ValueError: Expected 2D array, got 1D array instead"
error_full: |
  ValueError: Expected 2D array, got 1D array instead:
  array=[1. 2. 3. 4. 5.].
  Reshape your data either using array.reshape(-1, 1) if your data has a single feature or array.reshape(1, -1) if it contains a single sample.
cat: python
description: "scikit-learn models and transformers expect X with shape (n_samples, n_features). You passed a 1-D array or Series, e.g. a single column or a single sample for predict()."
tldr: "Single feature column: `X = X.reshape(-1, 1)` or use `df[[\"col\"]]` (double brackets) instead of `df[\"col\"]`. Single sample: `model.predict([[5.0, 3.2]])` or `x.reshape(1, -1)`. Keep the target `y` 1-D."
keywords: python sklearn valueerror expected 2d array got 1d array instead reshape(-1, 1) reshape(1, -1) single feature single sample predict fit standardscaler pandas double brackets scikit-learn
related: [python-valueerror-setting-an-array-element-with-a-sequence, python-modulenotfounderror-no-module-named-sklearn, python-valueerror-truth-value-of-an-array-with-more-than-one-element-is-ambiguous]
---
## What it means

Every scikit-learn estimator (`fit`, `predict`, `transform`, `score`) takes a 2-D feature matrix `X`: one row per sample, one column per feature. A 1-D array is ambiguous: it could be five samples with one feature, or one sample with five features. sklearn refuses to guess and tells you which reshape to use.

```python
import numpy as np
x = np.array([1, 2, 3, 4, 5])
x.shape                 # (5,)       1-D
x.reshape(-1, 1).shape  # (5, 1)     5 samples, 1 feature
x.reshape(1, -1).shape  # (1, 5)     1 sample, 5 features
```

`-1` means "work this dimension out from the array size".

## Cause 1: a single feature column

```python
from sklearn.linear_model import LinearRegression

X = df["area"]               # Series, 1-D
y = df["price"]
LinearRegression().fit(X, y) # ValueError
```

Select with a list of columns to get a DataFrame (2-D):

```python
X = df[["area"]]             # shape (n, 1)
model = LinearRegression().fit(X, y)
```

Or with NumPy: `X = df["area"].to_numpy().reshape(-1, 1)`.

## Cause 2: predicting a single sample

```python
model.predict([5.1, 3.5, 1.4, 0.2])     # 1-D: ValueError
model.predict([[5.1, 3.5, 1.4, 0.2]])   # 2-D: one row
```

With an array:

```python
sample = np.array([5.1, 3.5, 1.4, 0.2])
model.predict(sample.reshape(1, -1))
```

If the model was fitted on a DataFrame, predict with one too to avoid the `X does not have valid feature names` warning:

```python
model.predict(pd.DataFrame([[5.1, 3.5, 1.4, 0.2]], columns=X.columns))
```

## Cause 3: scalers and encoders on one column

`StandardScaler`, `MinMaxScaler`, `OneHotEncoder` and `SimpleImputer` also need 2-D input:

```python
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
df["age_scaled"] = scaler.fit_transform(df[["age"]]).ravel()
```

`.ravel()` turns the `(n, 1)` result back into 1-D for assigning to a column. `LabelEncoder` is the exception: it is meant for the target and takes 1-D.

## Cause 4: a loop or indexing removed a dimension

`X[0]` or `X[:, 0]` drops a dimension. Keep it with a slice:

```python
X[0:1]        # first row, shape (1, n_features)
X[:, [0]]     # first column, shape (n_samples, 1)
```

## Don't reshape the target

`y` should stay 1-D for most estimators. Passing a `(n, 1)` column vector as `y` gives `DataConversionWarning: A column-vector y was passed when a 1d array was expected`. Fix with `y.ravel()` or `df["price"]` (single brackets).
