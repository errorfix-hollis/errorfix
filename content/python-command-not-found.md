---
error: "python: command not found"
error_full: |
  bash: python: command not found
  zsh: command not found: python
  'python' is not recognized as an internal or external command, operable program or batch file.
  Command 'python' not found, did you mean: command 'python3' from deb python3
cat: python
description: "The shell can't find an executable named `python`. Modern Linux and macOS only ship `python3`, and on Windows Python isn't on PATH."
tldr: "Use `python3` instead (and `python3 -m pip`). On Debian/Ubuntu, `sudo apt install python-is-python3` makes `python` point to python3. On macOS add `alias python=python3` to `~/.zshrc`. On Windows reinstall Python with \"Add python.exe to PATH\" checked, or use the `py` launcher."
keywords: python command not found zsh bash python is not recognized as an internal or external command python3 python-is-python3 path windows macos ubuntu alias
related: [python-pip-command-not-found, linux-command-not-found, python-externally-managed-environment]
---
## What it means

There's no file named `python` in any directory on your `PATH`. Python 2 was removed from most systems, and distributions deliberately don't provide an unversioned `python` anymore (PEP 394). Python may be installed fine as `python3`.

Check:

```bash
which python3 python
python3 --version
```

## Fix 1: just use python3

```bash
python3 script.py
python3 -m pip install requests
python3 -m venv .venv
```

Inside an activated virtual environment, `python` *does* exist and points to the venv's interpreter:

```bash
python3 -m venv .venv
source .venv/bin/activate
python --version
```

## Fix 2: Debian / Ubuntu — install python-is-python3

```bash
sudo apt update
sudo apt install python3 python-is-python3
```

This adds the symlink `/usr/bin/python -> python3` the supported way. Ubuntu's message `Command 'python' not found, did you mean ... python-is-python3` suggests exactly this. On Fedora/RHEL, `python` usually already exists; otherwise `sudo dnf install python3` or `python-unversioned-command`.

Avoid hand-made symlinks in `/usr/bin` — package upgrades can break them.

## Fix 3: macOS — use python3 or an alias

macOS 12.3+ removed Python 2. Apple's `python3` comes with the Xcode command line tools (`xcode-select --install`), or install it with Homebrew:

```bash
brew install python
```

Homebrew also provides only `python3`, but puts unversioned links in `$(brew --prefix python)/libexec/bin`. Either add that to `PATH` or create an alias:

```bash
echo 'alias python=python3' >> ~/.zshrc
source ~/.zshrc
```

## Fix 4: Windows — add Python to PATH

`'python' is not recognized...` means the installer's PATH option was unchecked.

- Re-run the installer from python.org → **Modify** → enable **Add Python to environment variables**, or reinstall with **Add python.exe to PATH** ticked.
- Or use the launcher that's always installed: `py script.py`, `py -m pip install ...`.
- Open a **new** terminal after changing PATH.

If typing `python` opens the Microsoft Store, that's an "App execution alias". Disable it under *Settings → Apps → Advanced app settings → App execution aliases* (turn off `python.exe` and `python3.exe`), then install Python properly.

## Fix 5: scripts with `#!/usr/bin/env python`

Old scripts with this shebang fail with `/usr/bin/env: 'python': No such file or directory`. Change the first line to `#!/usr/bin/env python3`, or install `python-is-python3`.
