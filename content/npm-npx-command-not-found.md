---
error: "npx: command not found"
error_full: |
  bash: npx: command not found
  zsh: command not found: npx
  'npx' is not recognized as an internal or external command, operable program or batch file.
cat: npm
description: The shell can't find the npx executable. Node.js isn't installed, was installed without npm (some distro packages), or its bin directory isn't on your PATH (common with nvm in new shells, CI and IDE terminals).
tldr: "Check `node -v` and `npm -v`. If npm works, run `npm install -g npm` (npx ships with npm 7+) or use `npm exec -- <pkg>`. If Node is missing, install it with nvm (`nvm install --lts`) or the NodeSource/official installer, not the old distro package. With nvm, open a new shell or run `source ~/.nvm/nvm.sh`."
keywords: npx command not found not recognized as an internal or external command node npm nvm path install nodejs ubuntu apt create-react-app
related: [linux-command-not-found, npm-eacces-permission-denied, node-cannot-find-module]
---
## What it means

`npx` is a command-line tool bundled with npm (since npm 5.2; in npm 7+ it's a wrapper around `npm exec`). It lives in the same directory as `node` and `npm`. "command not found" means that directory isn't on your `PATH`, or npx was never installed.

Start by checking what does exist:

```bash
which node npm npx
node -v
npm -v
echo $PATH
```

## Cause 1: Node.js isn't installed

Install a current LTS. With nvm (Linux/macOS, no sudo needed):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh
nvm install --lts
npx --version
```

On Windows, use the installer from nodejs.org (leave "Add to PATH" checked) or `winget install OpenJS.NodeJS.LTS`, then open a **new** terminal.

On macOS with Homebrew: `brew install node`.

## Cause 2: Debian/Ubuntu's nodejs package without npm

`sudo apt install nodejs` from the distro repos installs Node but not npm/npx (and is often an old version). Either install the separate package:

```bash
sudo apt install npm
```

or, better, remove it and use nvm or NodeSource's packages, which include npm and npx.

## Cause 3: nvm isn't loaded in this shell

nvm works by modifying `PATH` from your shell startup file. In a new terminal that didn't load it, or a non-interactive script, `node` and `npx` vanish:

```bash
source ~/.nvm/nvm.sh
nvm use --lts
nvm alias default 'lts/*'     # so new shells get a version automatically
```

Make sure `~/.bashrc` or `~/.zshrc` contains the lines the nvm installer added. Scripts run by cron, systemd or `sudo` don't read those files; use full paths (`~/.nvm/versions/node/v22.x.x/bin/npx`) or source nvm.sh in the script.

`sudo npx ...` fails for the same reason: sudo resets `PATH`. Avoid sudo with npx; if you must, `sudo env "PATH=$PATH" npx ...`.

## Cause 4: npm is very old, or npx was removed

Old npm versions (< 5.2) have no npx. Update npm itself:

```bash
npm install -g npm@latest
```

If npm works but npx doesn't, you can always use the equivalent:

```bash
npm exec -- create-vite@latest my-app
# same as: npx create-vite@latest my-app
```

## Cause 5: Windows PATH or IDE terminal

After installing Node on Windows, already-open terminals and VS Code keep the old `PATH`. Close and reopen them (restart VS Code fully). Check that `C:\Program Files\nodejs\` is in your PATH (System Properties -> Environment Variables). In PowerShell, if you get `npx.ps1 cannot be loaded because running scripts is disabled`, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` or call `npx.cmd`.

## Cause 6: CI and Docker images

Images like `alpine` or `python` don't include Node. Use a `node:22` image, or in GitHub Actions add `actions/setup-node` before steps that call `npx`.
