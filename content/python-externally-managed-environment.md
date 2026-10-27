---
error: "error: externally-managed-environment"
error_full: |
  error: externally-managed-environment

  × This environment is externally managed
  ╰─> To install Python packages system-wide, try apt install
      python3-xyz, where xyz is the package you are trying to
      install.
cat: python
description: Your OS (Ubuntu 23.04+, Debian 12+, Homebrew, Fedora) blocks pip from installing into the system Python. Use a virtual environment or pipx.
tldr: "Create a virtual environment: `python3 -m venv .venv && source .venv/bin/activate && pip install <package>`. For command-line tools, use `pipx install <tool>`."
keywords: pip install externally managed environment pep 668 ubuntu debian break-system-packages venv pipx homebrew
related: [python-modulenotfounderror-no-module-named, python-pip-command-not-found]
---
## What it means

Since PEP 668, Linux distributions and Homebrew mark their Python as **externally managed**: packages are supposed to come from `apt`/`brew`, because `pip install` into the system Python can break OS tools that depend on it.

## Fix 1: use a virtual environment (recommended for projects)

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install requests
```

On Debian/Ubuntu you may first need `sudo apt install python3-venv` (or `python3.12-venv` to match your version).

Run your script with the venv active, or call its Python directly: `.venv/bin/python script.py`.

## Fix 2: pipx for command-line tools

For tools you run from the terminal (black, httpie, yt-dlp, poetry...):

```bash
sudo apt install pipx      # or: brew install pipx
pipx ensurepath
pipx install black
```

Each tool gets its own isolated environment, but its command is on your PATH.

## Fix 3: install the distro package

```bash
sudo apt install python3-requests
```

Good for common libraries, but versions are often older than on PyPI.

## Fix 4: override (not recommended)

```bash
pip install --user --break-system-packages requests
```

This works, but a future `apt upgrade` or a conflicting version can break system tools. Never combine it with `sudo`.

## Using uv

[uv](https://docs.astral.sh/uv/) creates virtual environments automatically: `uv venv && uv pip install requests`, or `uv run script.py`. Tools: `uv tool install black`.
