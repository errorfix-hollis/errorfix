---
error: "ModuleNotFoundError: No module named 'openai'"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 1, in <module>
      from openai import OpenAI
  ModuleNotFoundError: No module named 'openai'
cat: python
description: "The `openai` package is not installed in the Python interpreter that runs your script. Usually it was installed for a different Python, or outside the active virtual environment."
tldr: "Install it with the same interpreter that runs the code: `python -m pip install openai` (or `python3 -m pip install openai`). In a venv activate it first; in Jupyter run `%pip install openai` in a cell and restart the kernel."
keywords: python modulenotfounderror no module named openai pip install openai venv jupyter vscode interpreter importerror cannot import name OpenAI
related: [python-modulenotfounderror-no-module-named, python-externally-managed-environment, python-importerror-cannot-import-name]
---
## What it means

Python searched its `sys.path` and found no `openai` package. The PyPI package and the import name are both `openai`, so this is not a naming issue - it is an environment issue.

Check which Python is running and whether it sees the package:

```bash
python -c "import sys; print(sys.executable)"
python -m pip show openai
```

## Fix 1: install it for the right interpreter

```bash
python -m pip install openai
# or
python3 -m pip install openai
```

Using `python -m pip` instead of bare `pip` guarantees the package goes into the same interpreter you run. On Windows: `py -m pip install openai`.

If you get `error: externally-managed-environment` (Debian/Ubuntu 23.04+, Homebrew Python), use a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install openai
python main.py
```

## Fix 2: the virtual environment isn't active

If you installed into `.venv` but run `python main.py` from a new terminal, the system Python is used. Activate the venv again, or run it directly:

```bash
.venv/bin/python main.py
```

With Poetry / uv / pipenv, run through the tool:

```bash
poetry add openai && poetry run python main.py
uv add openai && uv run main.py
```

## Fix 3: VS Code / PyCharm uses a different interpreter

VS Code: `Ctrl+Shift+P` -> **Python: Select Interpreter** -> pick `.venv`. The bottom status bar shows the active one. PyCharm: **Settings -> Project -> Python Interpreter**.

## Fix 4: Jupyter notebook

The notebook kernel may not be the Python where you ran `pip`. Install from inside the notebook:

```python
%pip install openai
```

Then **Kernel -> Restart**.

## Fix 5: a file named `openai.py` shadows the package

If your own script is called `openai.py` (or there's an `openai/` folder next to it), `import openai` imports your file. You then typically see `ImportError: cannot import name 'OpenAI' from partially initialized module 'openai'`. Rename the file and delete `__pycache__`.

## Related: `cannot import name 'OpenAI' from 'openai'`

The `OpenAI` client class exists only in openai **1.0+**. Old code uses `openai.ChatCompletion.create(...)`, which was removed in 1.0. Upgrade and use the new client:

```bash
python -m pip install --upgrade openai
```

```python
from openai import OpenAI
client = OpenAI()   # reads OPENAI_API_KEY from the environment
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
print(resp.choices[0].message.content)
```

If you must keep old code working, pin the old version: `pip install "openai<1"`.

## Docker

Add it to `requirements.txt` and rebuild the image (`docker compose build --no-cache`); installing inside a running container is lost on restart.
