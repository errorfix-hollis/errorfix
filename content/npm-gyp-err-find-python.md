---
error: "gyp ERR! find Python"
error_full: |
  gyp ERR! find Python
  gyp ERR! find Python Python is not set from command line or npm configuration
  gyp ERR! find Python Python is not set from environment variable PYTHON
  gyp ERR! find Python checking if "python3" can be used
  gyp ERR! find Python - "python3" is not in PATH or produced an error
  gyp ERR! find Python You need to install the latest version of Python.
  gyp ERR! configure error
  gyp ERR! stack Error: Could not find any Python installation to use
cat: npm
description: A package with a native C/C++ addon (bcrypt, sqlite3, node-sass, canvas...) is being compiled with node-gyp, which needs Python and a C++ compiler, and it couldn't find a usable Python.
tldr: "Install Python 3 and build tools (`sudo apt install python3 make g++` / `xcode-select --install` / Visual Studio Build Tools with 'Desktop development with C++' on Windows), or point npm at it: `npm config set python /usr/bin/python3` or `export npm_config_python=/usr/bin/python3`. Better: upgrade the package to a version with prebuilt binaries."
keywords: npm gyp err find python could not find any python installation to use node-gyp rebuild native addon bcrypt sqlite3 node-sass build tools distutils
related: [npm-elifecycle, python-no-module-named-distutils, python-microsoft-visual-cpp-required]
---
## What it means

`node-gyp` builds native Node.js addons. It runs a Python program (gyp) to generate build files, then a C++ compiler. This error is the first step failing: no Python was found, or the one found didn't work. You see it during `npm install` when a dependency has no prebuilt binary for your Node version/OS.

Find which package is building:

```bash
npm install --foreground-scripts 2>&1 | grep -B5 "gyp ERR" | head -30
```

## Fix 1: install Python and a compiler

Debian/Ubuntu:

```bash
sudo apt update
sudo apt install python3 make g++
```

Fedora: `sudo dnf install python3 make gcc-c++`. Alpine (Docker): `apk add --no-cache python3 make g++`.

macOS:

```bash
xcode-select --install       # compiler; Python 3 is included with recent macOS or install via Homebrew
```

Windows: install Python 3 from python.org (tick "Add python.exe to PATH") and Visual Studio Build Tools with the **Desktop development with C++** workload. The old `npm install --global windows-build-tools` package is deprecated — don't use it.

## Fix 2: tell node-gyp which Python to use

If Python is installed but not found (custom path, only `python` and not `python3`, pyenv):

```bash
npm config set python /usr/bin/python3
# or for one command
npm_config_python=/usr/bin/python3 npm install
```

On Windows: `npm config set python C:\Path\To\python.exe`.

## Fix 3: Python 3.12+ and "No module named 'distutils'"

Older node-gyp versions import `distutils`, removed in Python 3.12. You then see `ModuleNotFoundError: No module named 'distutils'` right after gyp finds Python. Either upgrade node-gyp (bundled with npm — `npm install -g npm@latest`), or install setuptools, which provides a `distutils` shim:

```bash
python3 -m pip install setuptools
```

## Fix 4: avoid compiling at all

Often the real fix is that the package is old:

- `node-sass` is deprecated — replace with `sass` (pure JS): `npm uninstall node-sass && npm install -D sass`.
- `bcrypt` → upgrade to the latest, or use `bcryptjs` (pure JS).
- `sqlite3`, `canvas`, `sharp` — the latest versions ship prebuilt binaries for current Node LTS releases.

Prebuilt binaries are only published for supported Node versions. If you're on a brand-new or very old Node, switching to the current LTS (`nvm install --lts`) frequently makes the build step disappear.

## Fix 5: clean and retry

```bash
rm -rf node_modules package-lock.json
npm cache verify
npm install
```

Only delete the lockfile if you're fine with dependency versions changing; otherwise just remove `node_modules`.
