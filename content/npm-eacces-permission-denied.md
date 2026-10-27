---
error: "npm ERR! code EACCES"
error_full: |
  npm ERR! code EACCES
  npm ERR! syscall mkdir
  npm ERR! path /usr/local/lib/node_modules/some-package
  npm ERR! errno -13
  npm ERR! Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules/some-package'
cat: npm
description: npm can't write to the global install folder. Don't use sudo; point npm's global prefix at your home directory or use a Node version manager.
tldr: "Run `mkdir -p ~/.npm-global && npm config set prefix ~/.npm-global`, add `export PATH=~/.npm-global/bin:$PATH` to your shell profile, then install again without sudo."
keywords: npm install -g eacces permission denied usr local lib node_modules sudo global
related: [npm-eresolve-unable-to-resolve-dependency-tree]
---
## What it means

`npm install -g` writes to a system folder (`/usr/local/lib/node_modules` or `/usr/lib/node_modules`) owned by root. Your user can't write there.

## Fix 1: use a global folder in your home directory (recommended)

```bash
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc   # or ~/.zshrc
source ~/.bashrc
npm install -g some-package
```

## Fix 2: use a Node version manager

[nvm](https://github.com/nvm-sh/nvm), fnm or Volta install Node in your home directory, so global installs never need root:

```bash
nvm install --lts
nvm use --lts
npm install -g some-package
```

## Why not sudo?

`sudo npm install -g` works, but package install scripts then run as root, and files in `~/.npm` can end up owned by root, which causes **more** EACCES errors later.

## EACCES inside your project or ~/.npm

If the path in the error is your project or `~/.npm`, an earlier `sudo` command left root-owned files. Take them back:

```bash
sudo chown -R "$(whoami)" ~/.npm
sudo chown -R "$(whoami)" ./node_modules
```

## On Docker

In Node images, run as the `node` user and set `NPM_CONFIG_PREFIX=/home/node/.npm-global`, or install globals before switching users.
