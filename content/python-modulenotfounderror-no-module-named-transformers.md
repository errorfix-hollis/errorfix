---
error: "ModuleNotFoundError: No module named 'transformers'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      from transformers import AutoTokenizer, AutoModelForCausalLM
  ModuleNotFoundError: No module named 'transformers'
cat: python
description: "The Hugging Face transformers package is not installed in the Python interpreter that is running your code. Usually it was installed into a different environment, or a local file shadows it."
tldr: "Install it into the interpreter you actually run: `python -m pip install transformers` (plus a backend such as `python -m pip install torch`). In Jupyter use `%pip install transformers` and restart the kernel. Check with `python -c \"import sys, transformers; print(sys.executable, transformers.__version__)\"`."
keywords: modulenotfounderror no module named transformers hugging face pip install transformers jupyter conda venv torch tokenizer importerror
related: [python-modulenotfounderror-no-module-named-torch, python-modulenotfounderror-no-module-named, python-externally-managed-environment]
---
## What it means

Python searched every directory on `sys.path` and found no package called `transformers`. The PyPI package and the import name are the same (`transformers`), so this is almost never a naming problem: the package is missing from *this* interpreter.

## Cause 1: not installed at all

```bash
python -m pip install transformers
```

`transformers` needs a deep learning backend to load models. Most people want PyTorch:

```bash
python -m pip install "transformers[torch]"
# or separately
python -m pip install transformers torch
```

Without a backend the import succeeds, but loading a model prints `None of PyTorch, TensorFlow >= 2.0, or Flax have been found`.

## Cause 2: installed into a different Python

`pip install` and `python` can point to different interpreters (system Python, a venv, conda, pyenv). Always install with `python -m pip` using the same `python` that runs your script, and check:

```bash
which python            # Windows: where python
python -m pip show transformers
python -c "import sys; print(sys.executable)"
```

If you use a virtual environment, activate it first:

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
python -m pip install transformers torch
```

On Debian/Ubuntu, installing into system Python fails with `externally-managed-environment`. Use a venv as above rather than `--break-system-packages`.

## Cause 3: Jupyter / Colab uses another kernel

A notebook kernel often isn't the Python in your terminal. Install from inside the notebook so it goes to the kernel's interpreter:

```python
%pip install transformers torch
```

Then restart the kernel (Kernel → Restart). `!pip install` may install into the wrong environment; `%pip` does not. In VS Code, check the interpreter selected at the top right of the notebook.

## Cause 4: conda environment not active

```bash
conda activate myenv
conda install -c conda-forge transformers
# or
python -m pip install transformers
```

Packages installed in `base` aren't visible in other envs and vice versa.

## Cause 5: a local file named transformers.py

If your project has a `transformers.py` file or a `transformers/` folder, Python may import that instead, or fail inside it. The error then often becomes `ImportError: cannot import name 'AutoTokenizer' from 'transformers'`. Rename the file and delete any `__pycache__`:

```bash
python -c "import transformers; print(transformers.__file__)"
```

The path should end in `site-packages/transformers/__init__.py`.

## Cause 6: old version missing a class

If the module imports but a specific name fails (`cannot import name 'AutoModelForImageTextToText'`), your version is too old. Upgrade:

```bash
python -m pip install -U transformers
```

## Verify

```bash
python -c "import transformers, torch; print(transformers.__version__, torch.__version__)"
```
