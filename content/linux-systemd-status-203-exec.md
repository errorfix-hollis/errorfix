---
error: "status=203/EXEC"
error_full: |
  myapp.service: Main process exited, code=exited, status=203/EXEC
  myapp.service: Failed to execute /opt/myapp/start.sh: Permission denied
  myapp.service: Failed at step EXEC spawning /opt/myapp/start.sh: No such file or directory
cat: linux
description: "systemd could not execute the program in ExecStart= at all: the path is wrong or relative, the file isn't executable, the script has a bad shebang or CRLF line endings, or SELinux blocks it. The app itself never started."
tldr: "Run `journalctl -u myapp -n 20` to see the exact reason after 'Failed at step EXEC'. Use an absolute path in ExecStart, `chmod +x` the file, make sure the script starts with a valid shebang like `#!/bin/bash` and has LF line endings (`sed -i 's/\\r$//' start.sh`), then `sudo systemctl daemon-reload && sudo systemctl restart myapp`."
keywords: systemd status=203/exec failed at step exec spawning main process exited code=exited execstart permission denied no such file or directory exec format error service failed selinux shebang crlf
related: [linux-job-for-service-failed-because-the-control-process-exited-with-error-code, linux-bad-interpreter-no-such-file, linux-start-request-repeated-too-quickly]
---
## What it means

Exit status 203 is systemd's own code for **EXEC**: it forked the service process, but the `execve()` of the `ExecStart=` command failed. Your program never ran, so its own logs are empty. The real reason is in the journal, right next to the status line:

```bash
sudo systemctl status myapp
journalctl -u myapp -n 30 --no-pager
```

Look for `Failed at step EXEC spawning <path>: <reason>` or `Failed to execute <path>: <reason>`. The reason maps to the fixes below.

## Cause 1: `No such file or directory` — wrong path

`ExecStart=` needs an absolute path to the executable (systemd 239+ allows a bare command name only if it's in systemd's fixed search path, and it does *not* use your shell's `PATH`).

```ini
# wrong
ExecStart=node server.js
ExecStart=~/app/start.sh
# right
ExecStart=/usr/bin/node /opt/myapp/server.js
```

Find the real path with `command -v node`. Tools installed with nvm, pyenv or in a virtualenv live in your home directory; use their full path, e.g. `/home/app/.nvm/versions/node/v20.11.0/bin/node` or `/opt/myapp/venv/bin/python`.

`~` and `$HOME` are not expanded. Shell features (pipes, `&&`, redirects) don't work either; wrap them in `/bin/bash -c '...'` or a script.

## Cause 2: `No such file or directory` — but the file exists

For a script this means the **interpreter** from the shebang is missing. Typical reasons:

- Windows line endings: the kernel looks for `/bin/bash\r`. Check and fix:

```bash
head -1 /opt/myapp/start.sh | od -c | head -2   # look for \r
sed -i 's/\r$//' /opt/myapp/start.sh
```

  (Or paste the file into the [line ending inspector](/tools/line-ending-whitespace-inspector/).)
- A shebang pointing to a path that doesn't exist on this machine (`#!/usr/local/bin/python3`). See [bad interpreter: No such file or directory](/linux/linux-bad-interpreter-no-such-file/).
- A binary built for another architecture or against a missing dynamic loader (e.g. a glibc binary on Alpine).

## Cause 3: `Permission denied`

```bash
ls -l /opt/myapp/start.sh
sudo chmod +x /opt/myapp/start.sh
```

Also check:

- The `User=` in the unit can traverse every directory in the path (`namei -l /opt/myapp/start.sh`). Files in `/home/someone/` are often unreadable for other users, and `ProtectHome=true` hides `/home` completely.
- The filesystem isn't mounted `noexec` (common for `/tmp` and some data disks): `findmnt -T /opt/myapp`.
- **SELinux** (RHEL, Fedora, Rocky): binaries in home directories or with the wrong label are denied. Check `sudo ausearch -m avc -ts recent`, and fix with `sudo restorecon -Rv /opt/myapp` or move the file to a standard location such as `/usr/local/bin`.

## Cause 4: `Exec format error`

The file has no shebang line at all, or it's a binary for another CPU architecture. Add `#!/bin/bash` (or the right interpreter) as the very first line, with nothing before it, or run it explicitly: `ExecStart=/bin/bash /opt/myapp/start.sh`.

## Apply the fix

```bash
sudo systemctl daemon-reload
sudo systemctl restart myapp
sudo systemctl status myapp
```

Test the exact command as the service user first, which reproduces most problems instantly:

```bash
sudo -u app /opt/myapp/start.sh
```

If the service starts and *then* fails repeatedly, you'll see [start request repeated too quickly](/linux/linux-start-request-repeated-too-quickly/) instead; that's an application problem, not 203.
