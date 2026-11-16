---
error: "ModuleNotFoundError: No module named 'selenium'"
error_full: |
  Traceback (most recent call last):
    File "scraper.py", line 1, in <module>
      from selenium import webdriver
  ModuleNotFoundError: No module named 'selenium'
cat: python
description: "The Selenium Python bindings are not installed in the interpreter that runs your script, usually because pip installed them into another Python or venv."
tldr: "Install with the same interpreter that runs the script: `python -m pip install selenium` (inside your activated venv). Verify with `python -c \"import selenium; print(selenium.__version__)\"`. Selenium 4.6+ downloads the browser driver automatically via Selenium Manager."
keywords: modulenotfounderror no module named selenium pip install selenium webdriver python venv jupyter vscode interpreter selenium manager chromedriver
related: [python-modulenotfounderror-no-module-named, python-modulenotfounderror-no-module-named-requests, python-pip-command-not-found]
---
## What it means

`from selenium import webdriver` failed because no `selenium` package exists on this interpreter's `sys.path`. The package name and import name are the same (`selenium`), so the problem is almost always *which Python* the package went into.

## Fix 1: install it for the right interpreter

```bash
python -m pip install selenium
python -c "import selenium; print(selenium.__version__)"
```

If you have multiple Pythons, check which one runs your script:

```bash
which python            # Windows: where python
python -c "import sys; print(sys.executable)"
python -m pip --version
```

On Windows, the `py` launcher may pick a different version than `python`: use `py -m pip install selenium` if you run scripts with `py script.py`.

## Fix 2: use a virtual environment

On Ubuntu 23.04+, Debian 12+ and Homebrew Python, `pip install` into the system interpreter is blocked with `externally-managed-environment`. Create a venv:

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install selenium
python scraper.py
```

Run the script with the venv active (or with `.venv/bin/python scraper.py`). Cron jobs and systemd services don't activate venvs — use the full path to the venv's Python there.

## Fix 3: the IDE uses another interpreter

- **VS Code**: Ctrl+Shift+P → "Python: Select Interpreter" → choose `.venv`.
- **PyCharm**: Settings → Project → Python Interpreter; install `selenium` there.
- **Jupyter**: run `%pip install selenium` in a cell, then restart the kernel.

## Fix 4: a file named selenium.py

A script called `selenium.py` in your project shadows the package; Python imports your file, and you get `ImportError: cannot import name 'webdriver'` or similar. Rename it and remove `__pycache__/`.

## After the import works: drivers

Since Selenium 4.6, **Selenium Manager** finds or downloads the matching chromedriver/geckodriver automatically, so this is enough:

```python
from selenium import webdriver
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()
driver.get("https://example.com")
print(driver.find_element(By.TAG_NAME, "h1").text)
driver.quit()
```

If you still pass `executable_path=` (removed in Selenium 4.10) you'll get `TypeError: __init__() got an unexpected keyword argument 'executable_path'`. Use a `Service` object instead:

```python
from selenium.webdriver.chrome.service import Service
driver = webdriver.Chrome(service=Service("/path/to/chromedriver"))
```

`find_element_by_*` methods were also removed in 4.3 — use `find_element(By.ID, "...")`.

## Docker / headless servers

```dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium chromium-driver \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir selenium
```

Start Chrome with `--headless=new` and `--no-sandbox` in containers.
