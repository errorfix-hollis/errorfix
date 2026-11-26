---
error: "ModuleNotFoundError: No module named 'google'"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 1, in <module>
      from google.cloud import storage
  ModuleNotFoundError: No module named 'google'
  ModuleNotFoundError: No module named 'google.protobuf'
  ImportError: cannot import name 'genai' from 'google' (unknown location)
cat: python
description: "There is no single package called google: google is a namespace shared by many separate packages (google-cloud-storage, protobuf, google-genai, google-api-python-client...). You need to install the specific one your import refers to, in the active environment."
tldr: "Install the package that matches the import, using the interpreter that runs your code: `from google.cloud import storage` → `python -m pip install google-cloud-storage`; `google.protobuf` → `protobuf`; `from google import genai` → `google-genai`; `google.generativeai` → `google-generativeai`; `googleapiclient` → `google-api-python-client`. Don't `pip install google`."
keywords: python modulenotfounderror no module named google google.cloud google.protobuf protobuf google-genai generativeai google-api-python-client googleapiclient colab namespace package pip install
related: [python-modulenotfounderror-no-module-named, python-modulenotfounderror-no-module-named-tensorflow, python-importerror-cannot-import-name]
---
## What it means

`google` is a **namespace package**: dozens of independent PyPI packages each install a subpackage under `google/`. Python reports `No module named 'google'` when none of them is installed in the current environment, and `No module named 'google.xyz'` when others are installed but not the one you need.

Installing `pip install google` doesn't help — that package is an unrelated Google *search* scraper.

## Fix: install the package that matches your import

| Import | Install |
|---|---|
| `from google.cloud import storage` | `google-cloud-storage` |
| `from google.cloud import bigquery` | `google-cloud-bigquery` |
| `from google.cloud import firestore` | `google-cloud-firestore` |
| `from google.cloud import pubsub_v1` | `google-cloud-pubsub` |
| `from google.cloud import secretmanager` | `google-cloud-secret-manager` |
| `import google.protobuf` / `from google.protobuf import ...` | `protobuf` |
| `from google import genai` (Gemini, new SDK) | `google-genai` |
| `import google.generativeai as genai` (older Gemini SDK) | `google-generativeai` |
| `from googleapiclient.discovery import build` | `google-api-python-client` |
| `from google.oauth2 import service_account` / `google.auth` | `google-auth` |
| `from google_auth_oauthlib.flow import InstalledAppFlow` | `google-auth-oauthlib` |
| `from google.colab import drive` | only exists inside Google Colab |

```bash
python -m pip install google-cloud-storage
python -c "from google.cloud import storage; print('ok')"
```

## Cause 1: installed into a different environment

The most common cause after the wrong package name. `pip` and `python` point at different installations (system vs venv vs conda vs the IDE's interpreter).

```bash
which python; python -m pip --version
python -m pip show google-cloud-storage
```

Always install with `python -m pip ...` using the same `python` that runs the script, and select the venv in VS Code (Python: Select Interpreter) or PyCharm. In Jupyter, install into the kernel with `%pip install google-cloud-storage`.

## Cause 2: `No module named 'google.protobuf'`

TensorFlow, gRPC, ONNX and Streamlit need protobuf. Install or repair it:

```bash
python -m pip install --upgrade protobuf
```

If a library pins an older version, follow its requirement (e.g. `pip install "protobuf<5"`), as protobuf major versions are not always compatible with older generated code.

## Cause 3: a broken namespace package

Mixing conda and pip installs, or an old package that ships `google/__init__.py` as a regular package, can hide the other `google.*` subpackages. Symptoms: one google import works, another fails with `cannot import name ... from 'google' (unknown location)`. Reinstall the affected packages in a clean venv:

```bash
python -m venv .venv && source .venv/bin/activate
python -m pip install google-cloud-storage google-genai
```

## Cause 4: local file or folder named google

A `google.py` or `google/` directory in your project shadows the namespace. Rename it and remove `__pycache__`.

## Cause 5: `from google.colab import ...` outside Colab

`google.colab` is only available in Colab runtimes. Guard it:

```python
try:
    from google.colab import drive
    drive.mount('/content/drive')
except ImportError:
    pass   # running locally
```
