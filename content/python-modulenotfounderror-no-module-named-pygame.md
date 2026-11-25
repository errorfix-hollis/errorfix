---
error: "ModuleNotFoundError: No module named 'pygame'"
error_full: |
  Traceback (most recent call last):
    File "game.py", line 1, in <module>
      import pygame
  ModuleNotFoundError: No module named 'pygame'
cat: python
description: "The Python interpreter running your script can't find the pygame package. It is either not installed, or installed for a different Python / virtual environment."
tldr: "Install it for the exact interpreter you run: `python -m pip install pygame` (or `py -m pip install pygame` on Windows). If pip can't find a wheel for a brand-new Python version, try `python -m pip install pygame-ce` (a drop-in fork that is also imported as `import pygame`) or use a supported Python version."
keywords: python modulenotfounderror no module named pygame pip install pygame pygame-ce venv vscode interpreter python3 windows mac
related: [python-modulenotfounderror-no-module-named, python-pip-command-not-found, python-failed-building-wheel]
---
## What it means

`import pygame` searches the `sys.path` of the interpreter that is running. pygame is not part of the standard library, so it has to be installed with pip **into that same interpreter**. The error almost always means pip installed it somewhere else, or not at all.

Check which Python runs your code:

```bash
python -c "import sys; print(sys.executable)"
python -m pip show pygame
```

## Cause 1: pygame isn't installed

```bash
python -m pip install pygame
# Linux/macOS, if `python` is Python 2 or missing:
python3 -m pip install pygame
# Windows launcher:
py -m pip install pygame
```

Verify:

```bash
python -c "import pygame; print(pygame.version.ver)"
```

Using `python -m pip` instead of a bare `pip` guarantees the package goes to the same interpreter as `python`.

## Cause 2: installed into a different Python

Common with several Pythons installed (Microsoft Store + python.org, Homebrew + system, conda + system). `pip install pygame` worked, but your editor runs another interpreter.

- **VS Code**: `Ctrl+Shift+P` → *Python: Select Interpreter* → pick the one you installed into (or install into the one shown in the status bar).
- **PyCharm**: Settings → Project → Python Interpreter → `+` → pygame.
- **Thonny / IDLE**: use the built-in package manager, or run `python -m pip` with the interpreter shown in *Help → About*.

## Cause 3: virtual environment not activated

If you created a venv, install inside it and run the script with it:

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
python -m pip install pygame
python game.py
```

With conda: `conda activate myenv && python -m pip install pygame`.

## Cause 4: no wheel for your Python version (install fails)

When a new Python release comes out, pygame wheels can lag behind and pip tries to build from source, failing with errors like `Failed building wheel for pygame` or missing SDL headers. Options:

```bash
# Community edition fork, usually ships wheels faster; still `import pygame`
python -m pip uninstall pygame
python -m pip install pygame-ce
```

Or install a Python version pygame supports (e.g. via pyenv or python.org) and create a venv with it. Don't install both `pygame` and `pygame-ce` in the same environment; they overwrite each other.

On Linux, building from source needs SDL2 dev packages:

```bash
sudo apt install python3-dev libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev
```

Debian/Ubuntu also ship `sudo apt install python3-pygame` for the system Python.

## Cause 5: a file named pygame.py

If your own script is called `pygame.py` (or there's a `pygame/` folder next to it), Python imports that instead and you get odd errors like `module 'pygame' has no attribute 'init'`. Rename the file and delete `__pycache__`.

## Cause 6: externally-managed-environment

On recent Ubuntu/Debian/Homebrew, `pip install pygame` outside a venv may refuse with `externally-managed-environment`. Use a venv (Cause 3) or `pipx`-style isolation rather than `--break-system-packages`.
