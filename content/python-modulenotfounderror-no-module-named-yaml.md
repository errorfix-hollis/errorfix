---
error: "ModuleNotFoundError: No module named 'yaml'"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      import yaml
  ModuleNotFoundError: No module named 'yaml'
cat: python
description: "The yaml module comes from the PyYAML package, which isn't installed in the Python interpreter running your script. `pip install yaml` doesn't work because the package name differs from the import name."
tldr: "Install PyYAML into the same interpreter that runs the code: `python -m pip install pyyaml` (inside your venv), or `sudo apt install python3-yaml` for the system Python on Debian/Ubuntu. Check which Python runs with `python -c \"import sys; print(sys.executable)\"`."
keywords: python modulenotfounderror no module named yaml pyyaml pip install pyyaml python3-yaml import yaml venv conda requirements
related: [python-modulenotfounderror-no-module-named, python-externally-managed-environment, python-pip-command-not-found]
---
## What it means

`import yaml` loads a module provided by the **PyYAML** distribution. The error means Python searched every directory on `sys.path` and didn't find it. Either PyYAML isn't installed, or it was installed for a different Python than the one running your script.

The import name and the package name are different, which trips people up:

| You import | You install |
|---|---|
| `yaml` | `pyyaml` |
| `dotenv` | `python-dotenv` |
| `bs4` | `beautifulsoup4` |
| `cv2` | `opencv-python` |
| `PIL` | `pillow` |

`pip install yaml` fails with `No matching distribution found`; don't install random similarly named packages.

## Fix 1: install PyYAML for the interpreter you use

Use `python -m pip` so pip belongs to the same Python:

```bash
python -m pip install pyyaml
python -c "import yaml; print(yaml.__version__)"
```

On Windows use `py -m pip install pyyaml`. Add it to your dependencies so it doesn't disappear on the next setup:

```bash
echo "pyyaml" >> requirements.txt        # or: poetry add pyyaml / uv add pyyaml
```

## Fix 2: you're in the wrong environment

If `pip install pyyaml` said "Requirement already satisfied" but the import still fails, two Pythons are involved. Compare:

```bash
python -c "import sys; print(sys.executable)"
python -m pip --version            # shows which Python pip installs into
```

Typical mismatches:

- **Virtualenv not activated**: run `source .venv/bin/activate` (Windows: `.venv\Scripts\activate`), then install.
- **VS Code / PyCharm** uses a different interpreter: pick the venv via "Python: Select Interpreter" (Ctrl+Shift+P).
- **Jupyter**: install into the kernel's Python with `%pip install pyyaml` in a cell.
- **sudo**: `sudo python script.py` uses the system Python, not your venv.
- **cron / systemd**: they run `/usr/bin/python3`; use the full path to the venv's Python, e.g. `/opt/app/.venv/bin/python app.py`.

## Fix 3: system Python on Debian/Ubuntu/Fedora

Recent distributions block `pip install` into the system Python (`externally-managed-environment`). Use the distro package:

```bash
sudo apt install python3-yaml        # Debian/Ubuntu
sudo dnf install python3-pyyaml      # Fedora/RHEL
```

Or create a venv for your project:

```bash
python3 -m venv .venv && . .venv/bin/activate && pip install pyyaml
```

## Fix 4: Docker images

Install it in the Dockerfile with the image's Python:

```dockerfile
FROM python:3.12-slim
RUN pip install --no-cache-dir pyyaml
```

On Alpine-based images, prebuilt wheels are available for current versions; if pip tries to compile and fails, install `py3-yaml` with `apk add py3-yaml` or switch to a `-slim` image.

## Fix 5: a local file named yaml.py

If the error is instead `AttributeError: module 'yaml' has no attribute 'safe_load'`, you have a file called `yaml.py` (or a folder `yaml/`) in your project that shadows the real package. Rename it and delete `__pycache__`.

## Using it

Once installed, load files with `safe_load`, which doesn't execute arbitrary tags:

```python
import yaml

with open("config.yaml") as f:
    config = yaml.safe_load(f)
```

To check YAML syntax quickly, paste it into the [YAML validator](/tools/yaml-validator/).
