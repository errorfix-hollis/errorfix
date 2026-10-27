---
error: "npm ERR! enoent Could not read package.json"
error_full: |
  npm ERR! code ENOENT
  npm ERR! syscall open
  npm ERR! path /home/user/package.json
  npm ERR! errno -2
  npm ERR! enoent ENOENT: no such file or directory, open '/home/user/package.json'
  npm ERR! enoent This is related to npm not being able to find a file.
cat: npm
description: You ran npm in a folder without a package.json. cd into your project, or create one with npm init.
tldr: "Check the `path` in the error. `cd` into the folder that contains `package.json` and run the command again. Starting a new project? Run `npm init -y`."
keywords: npm enoent no such file or directory package.json could not read npm start install wrong folder
related: [node-cannot-find-module]
---
## What it means

npm looks for `package.json` in the **current folder**. The `path` line in the error shows where it looked, and there's no file there.

## Fixes

**Wrong folder** (most common, especially right after `git clone` or `npx create-...`):

```bash
ls                 # is package.json here?
cd my-project
npm install
```

**New project:** create a `package.json`:

```bash
npm init -y
```

**Monorepos:** the `package.json` you want may be in a subfolder (`frontend/`, `packages/app/`). `cd` into it, or use workspaces: `npm run build -w packages/app`.

**Typo in the file name:** it must be exactly `package.json` (not `Package.json` or `package.json.txt`; Windows hides known extensions by default).

## ENOENT for other files

The same `ENOENT` code appears for any missing file, for example:

- `spawn git ENOENT` / `spawn python ENOENT` – a program npm tried to run isn't installed or not on PATH.
- `ENOENT ... node_modules/.bin/...` – dependencies aren't installed. Run `npm install` (or `npm ci`).
- `ENOENT ... .npmrc` or cache paths – delete the cache with `npm cache clean --force` and retry.
