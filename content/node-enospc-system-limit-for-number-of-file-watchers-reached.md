---
error: "Error: ENOSPC: System limit for number of file watchers reached"
error_full: |
  Error: ENOSPC: System limit for number of file watchers reached, watch '/home/me/app/src'
      at FSWatcher.<computed> (node:internal/fs/watchers:247:19)
      at Object.watch (node:fs:2343:34)
    errno: -28,
    syscall: 'watch',
    code: 'ENOSPC',
cat: npm
description: On Linux, your dev server (webpack, Vite, Jest, nodemon, VS Code) ran out of inotify watches. It's not about disk space — raise fs.inotify.max_user_watches or watch fewer files.
tldr: "Raise the inotify limit permanently: `echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/60-inotify.conf && sudo sysctl --system`. Also exclude `node_modules` from watchers, and close other watchers (extra IDE windows, old dev servers)."
keywords: node enospc system limit for number of file watchers reached inotify max_user_watches sysctl webpack vite jest react-scripts nodemon vscode linux
related: [linux-too-many-open-files, linux-no-space-left-on-device, node-javascript-heap-out-of-memory]
---
## What it means

Linux tools watch files for changes using **inotify**. Each watched file or directory costs one watch, and there's a per-user limit, `fs.inotify.max_user_watches`. Older kernels default to 8192; newer ones scale it with RAM, but big JavaScript projects (`node_modules` can be 100,000+ files) still blow past it. When the limit is hit, the `inotify_add_watch` syscall returns `ENOSPC` — the "no space" refers to the watch table, **not your disk**.

Check the current values:

```bash
cat /proc/sys/fs/inotify/max_user_watches
cat /proc/sys/fs/inotify/max_user_instances
```

## Fix 1: raise the limit (permanent)

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/60-inotify.conf
sudo sysctl --system
```

Each watch uses roughly 1 KB of kernel memory on 64-bit systems, so 524288 is about 0.5 GB worst case — only used if actually allocated. Restart your dev server afterwards.

Temporary (until reboot):

```bash
sudo sysctl fs.inotify.max_user_watches=524288
```

If the error mentions `inotify_init` or "too many instances", raise `fs.inotify.max_user_instances` the same way (e.g. 512).

## Fix 2: stop watching node_modules

Most tools ignore it by default, but custom configs sometimes don't.

**webpack:**

```js
module.exports = {
  watchOptions: { ignored: /node_modules/ },
};
```

**Vite** (`vite.config.js`):

```js
export default {
  server: { watch: { ignored: ['**/node_modules/**', '**/dist/**'] } },
};
```

**nodemon** (`nodemon.json`):

```json
{ "watch": ["src"], "ignore": ["node_modules", "dist"] }
```

**VS Code** (`settings.json`):

```json
"files.watcherExclude": {
  "**/node_modules/**": true,
  "**/.git/objects/**": true,
  "**/dist/**": true
}
```

## Fix 3: find who is using the watches

The limit is per user, so other programs count too: extra VS Code windows, JetBrains IDEs, Dropbox, old `npm start` processes. List inotify users:

```bash
for p in /proc/[0-9]*; do
  n=$(find "$p/fd" -lname 'anon_inode:inotify' 2>/dev/null | wc -l)
  [ "$n" -gt 0 ] && echo "$n $(cat $p/comm 2>/dev/null) ${p#/proc/}"
done | sort -rn | head
```

(That counts inotify *instances* per process; closing the top offenders frees their watches.)

## Fix 4: use polling (last resort)

In containers or on network filesystems where you can't change sysctl, switch to polling. It uses more CPU but no inotify watches:

```bash
CHOKIDAR_USEPOLLING=true npm start      # create-react-app, chokidar-based tools
WATCHPACK_POLLING=true npm start        # webpack 5 / Next.js
```

Vite: `server: { watch: { usePolling: true } }`.

## Docker and WSL

In Docker, `max_user_watches` is a host kernel setting — set it on the host (or Docker Desktop VM), not in the container. In WSL 2, run the `sysctl` commands inside the distro; to make it stick, add the line to `/etc/sysctl.conf` there.
