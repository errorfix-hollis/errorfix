---
error: "ModuleNotFoundError: No module named 'langchain'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      from langchain.chat_models import ChatOpenAI
  ModuleNotFoundError: No module named 'langchain'
cat: python
description: "The `langchain` package isn't installed in the Python interpreter running your code, or you're importing a module that moved into a separate package such as `langchain_openai` or `langchain_community`."
tldr: "Install into the same interpreter: `python -m pip install -U langchain`. For integrations install the partner package too, e.g. `python -m pip install langchain-openai` and import `from langchain_openai import ChatOpenAI`. For `No module named 'langchain_community'` run `pip install langchain-community`."
keywords: modulenotfounderror no module named langchain langchain_community langchain_openai langchain_core pip install langchain venv jupyter chatopenai import error
related: [python-modulenotfounderror-no-module-named-openai, python-modulenotfounderror-no-module-named, python-importerror-cannot-import-name]
---
## What it means

Python searched `sys.path` of the *current interpreter* and found no `langchain` package. Either it's not installed there, or it's installed for a different Python (another venv, system Python, a different Jupyter kernel).

LangChain is also split into several distributions, so the module name in the error matters:

| Error says | Install |
|---|---|
| `No module named 'langchain'` | `langchain` |
| `No module named 'langchain_core'` | `langchain-core` |
| `No module named 'langchain_community'` | `langchain-community` |
| `No module named 'langchain_openai'` | `langchain-openai` |
| `No module named 'langchain_anthropic'` | `langchain-anthropic` |
| `No module named 'langchain_text_splitters'` | `langchain-text-splitters` |

Note the pip name uses hyphens; the import name uses underscores.

## Cause 1: not installed in this interpreter

Install with the exact Python you run:

```bash
python -m pip install -U langchain
python -c "import langchain, sys; print(langchain.__version__, sys.executable)"
```

Using `python -m pip` instead of bare `pip` avoids installing into a different Python. On Debian/Ubuntu system Python you'll get `externally-managed-environment` — use a venv:

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install langchain langchain-openai
```

## Cause 2: Jupyter / VS Code uses another kernel

In a notebook, install into the kernel's own interpreter:

```python
%pip install -U langchain langchain-openai
```

Then restart the kernel. In VS Code, pick the right interpreter with *Python: Select Interpreter* (the `.venv` one).

## Cause 3: old import paths after upgrading

Many tutorials use imports from LangChain 0.0.x that were moved. Since 0.1/0.2 integrations live in separate packages:

```python
# Old (fails or warns on current versions)
from langchain.chat_models import ChatOpenAI
from langchain.llms import OpenAI
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.document_loaders import PyPDFLoader

# Current
from langchain_openai import ChatOpenAI, OpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.prompts import ChatPromptTemplate
```

```bash
pip install -U langchain langchain-openai langchain-community faiss-cpu pypdf
```

## Cause 4: a file named langchain.py

If your script or a folder in the project is called `langchain.py` / `langchain/`, Python imports that instead and then can't find submodules (`No module named 'langchain.chains'; 'langchain' is not a package`). Rename it and delete `__pycache__`.

## Cause 5: unsupported Python version

Current LangChain releases require Python 3.9+ (newer ones 3.10+). On older Python, pip may install an ancient version or fail with `Could not find a version that satisfies the requirement`. Check `python --version` and upgrade.

## Pin versions

LangChain packages must be compatible with each other. Upgrade them together and pin in `requirements.txt`:

```bash
pip install -U langchain langchain-core langchain-community langchain-openai
pip freeze | grep -i langchain >> requirements.txt
```
