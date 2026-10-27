---
error: "Too many open files"
error_full: |
  Error: EMFILE: too many open files, watch '/home/me/app/src'
  OSError: [Errno 24] Too many open files
  accept4: too many open files
cat: linux
description: A process hit its file descriptor limit (ulimit -n), or file watchers hit the inotify limit. Raise the limit, or fix code that leaks open files/sockets.
tldr: "Check the limit with `ulimit -n`. Raise it for the session: `ulimit -n 65535`; for services set `LimitNOFILE=65535` in the systemd unit. For `EMFILE ... watch` errors from dev servers, raise `fs.inotify.max_user_watches`."
keywords: linux too many open files emfile errno 24 ulimit -n nofile limits.conf LimitNOFILE inotify max_user_watches node watch
related: [linux-no-space-left-on-device, linux-address-already-in-use]
---
## What it means

Every open file, socket, pipe and watcher uses a *file descriptor*. Each process has a limit (often 1024 soft by default). Error code `EMFILE` / `Errno 24` means the process reached it.

Check current limits and usage:

```bash
ulimit -Sn; ulimit -Hn            # soft / hard limit for this shell
cat /proc/<PID>/limits | grep files
ls /proc/<PID>/fd | wc -l          # how many are open now
```

## Fix 1: raise the limit for your shell

```bash
ulimit -n 65535     # up to the hard limit
```

Permanent for user logins, in `/etc/security/limits.conf`:

```
*   soft  nofile  65535
*   hard  nofile  65535
```

Log out and back in.

## Fix 2: services under systemd

`limits.conf` does not apply to systemd services. Add an override:

```bash
sudo systemctl edit myapp
```

```ini
[Service]
LimitNOFILE=65535
```

```bash
sudo systemctl restart myapp
```

For Docker containers: `docker run --ulimit nofile=65535:65535 ...`.

## Fix 3: file watchers (`EMFILE: watch`, `ENOSPC: System limit for number of file watchers reached`)

Node dev servers (webpack, Vite, Jest, nodemon) and IDEs use inotify watches:

```bash
echo "fs.inotify.max_user_watches=524288" | sudo tee /etc/sysctl.d/99-inotify.conf
echo "fs.inotify.max_user_instances=512" | sudo tee -a /etc/sysctl.d/99-inotify.conf
sudo sysctl --system
```

Also exclude `node_modules` and build folders from watching.

On macOS, `EMFILE` with watchers is often fixed by installing watchman (`brew install watchman`).

## Fix 4: the code leaks descriptors

If the count in `/proc/<PID>/fd` keeps growing, something isn't being closed. Check with `lsof -p <PID>`. Use context managers / finally blocks:

```python
with open(path) as f:
    data = f.read()
```

Reuse HTTP clients and DB connection pools instead of creating new ones per request.
