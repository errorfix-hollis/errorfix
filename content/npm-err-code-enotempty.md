---
error: "npm ERR! code ENOTEMPTY"
error_full: |
  npm ERR! code ENOTEMPTY
  npm ERR! syscall rename
  npm ERR! path /home/me/app/node_modules/webpack
  npm ERR! dest /home/me/app/node_modules/.webpack-Xa3bC9d1
  npm ERR! errno -39
  npm ERR! ENOTEMPTY: directory not empty, rename '/home/me/app/node_modules/webpack' -> '/home/me/app/node_modules/.webpack-Xa3bC9d1'
cat: npm
description: "npm tried to rename a folder inside node_modules (or the global prefix) but the target was not empty, usually leftovers from an interrupted install. Deleting node_modules and reinstalling fixes it."
tldr: "Delete the leftovers and reinstall: `rm -rf node_modules` (and any `node_modules/.<name>-*` temp folders), then `npm install` (or `npm ci`). For global installs, remove the folder named in the error under `$(npm root -g)` and run `npm install -g <pkg>` again."
keywords: npm err code enotempty directory not empty rename errno -39 node_modules npm install global npm update interrupted
related: [npm-eperm-operation-not-permitted, npm-eacces-permission-denied, npm-eresolve-unable-to-resolve-dependency-tree]
---
## What it means

When npm replaces a package it first renames the existing folder to a temporary hidden name such as `node_modules/.webpack-Xa3bC9d1`, writes the new version, then removes the old one. If an earlier install was interrupted (Ctrl+C, crash, full disk, editor locking files), that temporary folder is left behind. The next rename hits a destination that already exists and is not empty, and the OS returns `ENOTEMPTY` (errno 39 on Linux, 66 on macOS).

## Fix 1: clean reinstall (project)

```bash
rm -rf node_modules
npm install
```

If you have a lockfile and want an exact reproduction, use `npm ci`, which always deletes `node_modules` first.

You can also remove just the leftovers named in the error:

```bash
rm -rf node_modules/.webpack-*
npm install
```

On Windows (PowerShell):

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

Keep `package-lock.json` unless you intend to re-resolve versions. Deleting it is not needed for this error.

## Fix 2: global installs (`npm install -g`, `npm update -g`)

Same problem in the global prefix, often when updating npm itself or a CLI:

```bash
npm root -g                      # e.g. /usr/local/lib/node_modules
rm -rf "$(npm root -g)/.npm-"*   # leftovers named in the error
rm -rf "$(npm root -g)/npm"      # only if npm itself is the broken package
```

If you removed npm itself, reinstall Node (or use `corepack`/your version manager) to get npm back. With nvm:

```bash
nvm install --reinstall-packages-from=current node
```

If the global prefix needs `sudo`, see [EACCES permission denied](/npm/npm-eacces-permission-denied/) and switch to a user-owned prefix or nvm instead.

## Fix 3: something keeps the folder busy

On Windows and in synced folders, another process can hold files open so the old directory can't be cleaned up:

- Stop dev servers, watchers (`npm run dev`, `jest --watch`), and close the editor.
- Exclude the project from OneDrive/Dropbox sync and antivirus real-time scanning.
- In Docker with a bind-mounted `node_modules`, run the install inside the container only, or use a named volume for `node_modules`.

Then repeat Fix 1.

## Fix 4: corrupted cache

If the error comes back immediately after a clean reinstall:

```bash
npm cache verify
# or, more drastic
npm cache clean --force
npm install
```

Also check free disk space (`df -h`); a full disk mid-install is a common way to end up with half-written folders.
