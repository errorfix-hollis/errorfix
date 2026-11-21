---
error: "Error: spawn ENOENT"
error_full: |
  node:events:497
        throw er; // Unhandled 'error' event
        ^

  Error: spawn python ENOENT
      at ChildProcess._handle.onexit (node:internal/child_process:286:19)
      at onErrorNT (node:internal/child_process:484:16)
    errno: -2,
    code: 'ENOENT',
    syscall: 'spawn python',
    path: 'python',
    spawnargs: [ 'script.py' ]
cat: npm
description: "Node's child_process tried to start a program that it could not find: the command isn't installed, isn't on PATH, the cwd doesn't exist, or on Windows it's a .cmd/.bat file that needs a shell."
tldr: "Check the `path` field in the error and run `which <cmd>` (`where <cmd>` on Windows). Install the program or use its absolute path. On Windows use `spawn('npm.cmd', ...)` or pass `{ shell: true }`. Make sure the `cwd` option points to an existing directory."
keywords: node error spawn enoent child_process spawn execfile cross-spawn npm spawn ENOENT windows npm.cmd shell true PATH cwd npm ERR code ENOENT syscall spawn
related: [node-cannot-find-module, npm-elifecycle, npm-npx-command-not-found]
---
## What it means

`spawn()`, `execFile()` and libraries built on them (cross-spawn, execa, electron-builder, many CLIs) ask the OS to run a program directly. `ENOENT` ("no such file or directory") means the executable named in `path` / `syscall: 'spawn <cmd>'` could not be found. It's the program that's missing, not your script file.

## Cause 1: the program isn't installed or not on PATH

```bash
which python python3 git ffmpeg     # macOS/Linux
where python                        # Windows
```

Many systems have only `python3`, not `python`. Install the tool or call the name that exists:

```js
const { spawn } = require("node:child_process");
spawn("python3", ["script.py"], { stdio: "inherit" });
```

PATH can differ between your terminal and the process running Node (systemd services, cron, GUI apps, IDE run configs, Docker images). Use an absolute path (`/usr/bin/ffmpeg`) or set `env: { ...process.env, PATH: ... }`.

## Cause 2: Windows `.cmd` / `.bat` shims

On Windows, `npm`, `npx`, `yarn`, `pnpm` and most global CLIs are `.cmd` files. `spawn("npm", ...)` looks for `npm.exe` and fails.

```js
const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
spawn(cmd, ["run", "build"], { stdio: "inherit", shell: process.platform === "win32" });
```

Since Node 18.20.2 / 20.12.2 (security fix CVE-2024-27980), spawning `.cmd`/`.bat` files without `shell: true` throws `EINVAL` instead, so `shell: true` is required on Windows. Alternatively use the `cross-spawn` package.

## Cause 3: command and arguments in one string

`spawn` does not parse a command line:

```js
spawn("git status --short");                // ENOENT: looks for a program literally named "git status --short"
spawn("git", ["status", "--short"]);        // correct
exec("git status --short", cb);             // exec runs through a shell
```

## Cause 4: the `cwd` doesn't exist

If the `cwd` option points to a missing directory, Node also reports `spawn <cmd> ENOENT`, even though the command exists.

```js
const fs = require("node:fs");
const dir = path.resolve(__dirname, "build");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
spawn("make", [], { cwd: dir });
```

## Cause 5: `npm ERR! code ENOENT` with `syscall spawn`

When npm reports `syscall spawn` / `spawn sh ENOENT` or `spawn bash ENOENT`, the shell used for scripts is missing or misconfigured (common in minimal Docker images such as `distroless`, or a bad `script-shell` setting):

```bash
npm config get script-shell
npm config delete script-shell
```

In Alpine images use `/bin/sh` in scripts rather than bash, or `apk add bash`. If a script calls a local binary (`spawn vite ENOENT`), run `npm install` so `node_modules/.bin` exists.

## Handle the error

Always attach an `error` listener so a missing program doesn't crash the process with `Unhandled 'error' event`:

```js
const child = spawn("ffmpeg", args);
child.on("error", (err) => {
  if (err.code === "ENOENT") console.error("ffmpeg is not installed or not on PATH");
  else console.error(err);
});
```
