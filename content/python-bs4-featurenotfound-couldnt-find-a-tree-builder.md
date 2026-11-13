---
error: "bs4.FeatureNotFound: Couldn't find a tree builder with the features you requested: lxml. Do you need to install a parser library?"
error_full: |
  Traceback (most recent call last):
    File "scrape.py", line 6, in <module>
      soup = BeautifulSoup(html, "lxml")
    File ".../site-packages/bs4/__init__.py", line 250, in __init__
      raise FeatureNotFound(
  bs4.FeatureNotFound: Couldn't find a tree builder with the features you requested: lxml. Do you need to install a parser library?
cat: python
description: "BeautifulSoup doesn't parse HTML itself; it uses a parser library. You asked for lxml (or html5lib, or xml) but that library isn't installed in the Python environment running your script."
tldr: "Install the parser into the same interpreter: `python -m pip install lxml` (or `html5lib`). Or switch to the built-in parser, which needs nothing extra: `BeautifulSoup(html, \"html.parser\")`. For XML use `\"xml\"` / `\"lxml-xml\"`, which also requires lxml."
keywords: python beautifulsoup bs4 featurenotfound couldn't find a tree builder with the features you requested lxml html5lib html.parser xml parser library pip install lxml
related: [python-modulenotfounderror-no-module-named-bs4, python-modulenotfounderror-no-module-named, python-failed-building-wheel]
---
## What it means

The second argument to `BeautifulSoup(markup, features)` selects a parser:

| features | Library needed | Notes |
|---|---|---|
| `"html.parser"` | none (standard library) | decent speed, always available |
| `"lxml"` | `lxml` | fastest, lenient |
| `"xml"` / `"lxml-xml"` | `lxml` | the only XML parser bs4 supports |
| `"html5lib"` | `html5lib` | parses like a browser, slow |

`FeatureNotFound` means bs4 looked for a builder matching your feature string and none was registered, because the library behind it isn't importable.

## Fix 1: install the parser in the right environment

```bash
python -m pip install lxml
# or
python -m pip install html5lib
```

Use the same `python` that runs your script (activate your venv first). In Jupyter, run `%pip install lxml` in a cell and **restart the kernel** — bs4 checks available builders when it's imported, so an already-running kernel won't see the new parser.

Check:

```bash
python -c "import lxml, bs4; print(lxml.__version__, bs4.__version__)"
```

With conda: `conda install lxml`.

## Fix 2: use the built-in parser

If you don't need lxml specifically:

```python
from bs4 import BeautifulSoup
soup = BeautifulSoup(html, "html.parser")
```

This removes the dependency entirely, which is handy for serverless functions and minimal containers. Results can differ slightly on broken HTML, so pick one parser and use it consistently.

## Fix 3: parsing XML

`BeautifulSoup(data, "xml")` needs lxml — `html.parser` can't do XML properly (it lowercases tags and mishandles namespaces). Install lxml, or use the standard library for simple XML:

```python
import xml.etree.ElementTree as ET
root = ET.fromstring(data)
```

## Fix 4: lxml fails to install

On new Python versions or unusual platforms (Alpine, ARM), pip may try to build lxml from source and fail with missing `libxml2` / `libxslt` headers. Upgrade pip first so it finds a prebuilt wheel:

```bash
python -m pip install --upgrade pip
python -m pip install lxml
```

If you must build: Debian/Ubuntu `sudo apt install libxml2-dev libxslt1-dev python3-dev`; Alpine `apk add libxml2-dev libxslt-dev gcc musl-dev`. See [failed building wheel](/python/python-failed-building-wheel/).

## Fix 5: typo in the feature string

`"lxml "`, `"html"`, `"html5"` or `"parser"` don't match any builder and raise the same error. Valid values are exactly those in the table above.

## pandas.read_html variant

`pandas.read_html` raises `ImportError: lxml not found, please install it` (or asks for html5lib + bs4). Same fix: `python -m pip install lxml`, or pass `flavor="bs4"` with bs4 and html5lib installed.
