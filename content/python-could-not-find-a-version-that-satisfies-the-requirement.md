---
error: "ERROR: Could not find a version that satisfies the requirement"
error_full: |
  ERROR: Could not find a version that satisfies the requirement tensorflow (from versions: none)
  ERROR: No matching distribution found for tensorflow
cat: python
description: "pip found no release of the package that is compatible with your Python version, OS/CPU, or the version you pinned, or it could not reach the index at all. \"(from versions: none)\" usually means a wrong name, an unsupported Python version, or no network."
tldr: "Check the exact name on pypi.org, check your Python version (`python -V`) against the package's supported versions, upgrade pip (`python -m pip install -U pip`), and run `python -m pip index versions <pkg>` to see what's available. Use a supported Python (e.g. 3.12 instead of a brand-new release) in a venv if needed."
keywords: pip could not find a version that satisfies the requirement no matching distribution found from versions none python version wheel platform proxy index-url
related: [python-modulenotfounderror-no-module-named, python-externally-managed-environment, python-ssl-certificate-verify-failed]
---
## What it means

pip downloaded the list of files for the package from the index (PyPI by default) and none of them matched your environment and requirement. The `(from versions: ...)` list shows which versions pip considered compatible. If it says `none`, nothing at all was usable.

First, gather facts:

```bash
python -V
python -m pip -V                       # which Python is pip tied to?
python -m pip index versions requests  # what versions are visible (pip 21.2+)
```

## Cause 1: wrong package name

The import name is often not the PyPI name:

| import | pip install |
|---|---|
| `cv2` | `opencv-python` |
| `sklearn` | `scikit-learn` |
| `PIL` | `Pillow` |
| `yaml` | `PyYAML` |
| `bs4` | `beautifulsoup4` |
| `dotenv` | `python-dotenv` |

Standard-library modules (`json`, `os`, `sqlite3`, `tkinter`) can't be installed with pip at all.

## Cause 2: your Python version isn't supported

Packages with compiled extensions (tensorflow, torch, numpy older versions, etc.) publish wheels only for specific Python versions. On a brand-new Python release, or on an old one, there may be no matching files. Check "Requires: Python" and the file list on the package's pypi.org page.

Fix: create a venv with a supported interpreter:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
pip install tensorflow
```

Also check you're not on 32-bit Python on Windows — many packages ship 64-bit wheels only.

## Cause 3: the pinned version doesn't exist or is too old

```
ERROR: Could not find a version that satisfies the requirement django==5.9 (from versions: 1.1.3, ..., 5.1.2)
```

Here the list is populated — pick a version from it, or loosen the pin in `requirements.txt` (e.g. `django>=5.0,<6`). Some old releases also declare `Requires-Python` that excludes your interpreter, so they're hidden from the list.

## Cause 4: outdated pip

Old pip versions don't understand newer wheel tags (e.g. `manylinux_2_28`, macOS arm64) and skip valid files:

```bash
python -m pip install --upgrade pip
```

## Cause 5: no access to the index (network, proxy, SSL)

If every package fails with `(from versions: none)`, pip probably can't reach PyPI. Look for warnings above the error like `Retrying ... NewConnectionError` or `SSLError`.

```bash
python -m pip install requests -v          # verbose: shows URLs tried
python -m pip config list                  # custom index-url set?
pip install --proxy http://proxy:8080 requests
```

A misconfigured `index-url` in `pip.conf` / `PIP_INDEX_URL` pointing at a private mirror that lacks the package gives the same error. Add PyPI explicitly with `--extra-index-url https://pypi.org/simple` if your policy allows it.

## Cause 6: package needs a special index

PyTorch CUDA builds are on PyTorch's own index; follow the command from pytorch.org, e.g.:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

## Cause 7: pre-release only

If a package only has pre-releases (`2.0.0b1`), pip ignores them unless you ask: `pip install --pre <pkg>`.
