---
error: "ModuleNotFoundError: No module named 'bs4'"
error_full: |
  Traceback (most recent call last):
    File "scraper.py", line 2, in <module>
      from bs4 import BeautifulSoup
  ModuleNotFoundError: No module named 'bs4'
cat: python
description: "BeautifulSoup 4 is imported as bs4 but installed as the PyPI package beautifulsoup4. It's missing from the Python interpreter that runs your script."
tldr: "Run `python -m pip install beautifulsoup4` with the same Python you use to run the script (activate your venv first). Don't install the old `BeautifulSoup` package (v3, Python 2 only). For Jupyter use `%pip install beautifulsoup4`."
keywords: python modulenotfounderror no module named bs4 beautifulsoup4 beautifulsoup pip install web scraping lxml html.parser venv
related: [python-modulenotfounderror-no-module-named, python-modulenotfounderror-no-module-named-dotenv, python-externally-managed-environment]
---
## What it means

`from bs4 import BeautifulSoup` needs the module `bs4`, which comes from the PyPI package **`beautifulsoup4`**. Python didn't find it in any directory on `sys.path` for the interpreter that's running.

## Fix 1: install `beautifulsoup4`

```bash
python -m pip install beautifulsoup4
```

Notes on package names:

- `beautifulsoup4`: correct, current package.
- `bs4`: a dummy package on PyPI that just depends on `beautifulsoup4`. It works, but use the real name in `requirements.txt`.
- `BeautifulSoup` (no 4): BeautifulSoup **3**, Python 2 only. Installing it on Python 3 fails with a syntax error about `print`.

Add a parser too if you use one other than the built-in `html.parser`:

```bash
python -m pip install lxml          # BeautifulSoup(html, "lxml")
python -m pip install html5lib      # BeautifulSoup(html, "html5lib")
```

Otherwise you'll get `bs4.FeatureNotFound: Couldn't find a tree builder with the features you requested: lxml`.

## Fix 2: installed, but for another Python

The most common cause when `pip install` "already worked". Check what's running:

```bash
python -c "import sys; print(sys.executable)"
python -m pip show beautifulsoup4
```

- Using a **venv**? Activate it (`source .venv/bin/activate`, Windows `.venv\Scripts\activate`) and install inside it.
- **Several Pythons** (e.g. 3.11 and 3.12, or Homebrew + system)? Use `python3.12 -m pip install beautifulsoup4` with the exact version you run.
- **VS Code / PyCharm**: pick the same interpreter in the editor (VS Code: *Python: Select Interpreter*).
- **Jupyter**: run `%pip install beautifulsoup4` in a cell, then restart the kernel.
- **Windows**: `py -m pip install beautifulsoup4` targets the default `py` launcher Python.

On Debian/Ubuntu system Python, `pip install` may be blocked with [externally-managed-environment](/python/python-externally-managed-environment/). Use a venv or `sudo apt install python3-bs4`.

## Fix 3: a file named `bs4.py`

If your script is called `bs4.py` (or there's a `bs4/` folder next to it), Python imports that instead of the library. You then usually see `ImportError: cannot import name 'BeautifulSoup' from partially initialized module 'bs4'`. Rename the file and delete `__pycache__/`.

## Fix 4: Docker, cron, CI

Each environment has its own Python. Make sure the dependency is listed:

```text
# requirements.txt
beautifulsoup4>=4.12
requests>=2.31
```

For cron jobs, call the venv's interpreter by absolute path:

```cron
0 * * * * /home/me/scraper/.venv/bin/python /home/me/scraper/scraper.py
```

## Verify

```python
import bs4
print(bs4.__version__)
from bs4 import BeautifulSoup
print(BeautifulSoup("<p>hi</p>", "html.parser").p.text)
```
