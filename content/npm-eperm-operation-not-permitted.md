---
error: "npm ERR! code EPERM operation not permitted"
error_full: |
  npm ERR! code EPERM
  npm ERR! syscall rename
  npm ERR! path C:\Users\me\app\node_modules\.esbuild.DELETE
  npm ERR! errno -4048
  npm ERR! Error: EPERM: operation not permitted, rename 'C:\Users\me\app\node_modules\esbuild' -> 'C:\Users\me\app\node_modules\.esbuild.DELETE'
cat: npm
description: The operating system refused a file operation (rename, unlink, mkdir) npm needed. On Windows it's almost always a file locked by a running process, antivirus or an editor; elsewhere it's ownership or a read-only/synced folder.
tldr: "Stop everything using the project (dev server, `node`, VS Code terminals, Docker), then `npm cache verify`, delete `node_modules` (`npx rimraf node_modules`) and run `npm install` again. On Windows exclude the project from antivirus/OneDrive; on Linux/macOS fix ownership with `sudo chown -R $(whoami) ~/.npm .`."
keywords: npm err code eperm operation not permitted rename unlink errno -4048 windows file locked antivirus onedrive node_modules npm cache clean verify rimraf vscode
related: [npm-eacces-permission-denied, npm-enoent-package-json, npm-elifecycle]
---
## What it means

`EPERM` is the OS saying "you are not allowed to do this operation on this file". The `syscall` line tells you which operation (`rename`, `unlink`, `rmdir`, `open`, `mkdir`) and `path` tells you where. Unlike `EACCES` (classic Unix permission bits), on Windows `EPERM` (`errno -4048`) usually means the file is **open or locked** by another process.

## Fix 1: close whatever is locking the files (Windows)

npm replaces packages by renaming folders. If any process has a file open inside `node_modules` (often native binaries like `esbuild.exe`, `.node` addons, or Electron), Windows forbids the rename.

1. Stop running dev servers, test watchers and `node` processes:

   ```powershell
   taskkill /F /IM node.exe
   ```

2. Close editors/terminals that have the project open (VS Code's TypeScript server and ESLint keep files open).
3. Retry `npm install`.

If it still fails, delete `node_modules` and reinstall:

```powershell
npx rimraf node_modules
npm install
```

(`rimraf` handles long paths and retries better than Explorer or `rmdir`.)

## Fix 2: antivirus, Windows Defender, OneDrive

Real-time scanners open every new file npm writes, briefly locking it. Add the project folder and the npm cache (`%LocalAppData%\npm-cache`) to Defender/antivirus exclusions.

Don't keep projects inside OneDrive, Dropbox or Google Drive synced folders (OneDrive includes `Desktop` and `Documents` by default). Move the project to e.g. `C:\dev\app`.

## Fix 3: the npm cache is corrupted or locked

```bash
npm cache verify
# if that reports problems or the error mentions npm-cache:
npm cache clean --force
```

Then reinstall. If the path in the error is inside the cache and you're on Windows, make sure no other `npm` command is running at the same time.

## Fix 4: ownership problems (Linux/macOS)

Running `sudo npm install` once leaves root-owned files in the project or `~/.npm`. Later installs as your user fail with `EPERM` or `EACCES`:

```bash
sudo chown -R "$(whoami)" ~/.npm
sudo chown -R "$(whoami)" node_modules package-lock.json
```

Never use `sudo` for project installs. For global installs, use a Node version manager (nvm, fnm) or set a user prefix:

```bash
npm config set prefix ~/.npm-global
export PATH="$HOME/.npm-global/bin:$PATH"
```

## Fix 5: global installs on Windows

`EPERM` when running `npm install -g` into `C:\Program Files\nodejs` means you need an elevated terminal, or better, a per-user prefix:

```powershell
npm config set prefix "$env:APPDATA\npm"
```

## Fix 6: mounted or read-only filesystems

In Docker bind mounts, WSL `/mnt/c/...`, or network drives, renames and symlinks may not be allowed. Work inside the Linux filesystem in WSL (`~/projects`), and in Docker use a named volume for `node_modules`:

```yaml
volumes:
  - .:/app
  - node_modules:/app/node_modules
```
