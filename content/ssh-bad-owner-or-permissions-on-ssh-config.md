---
error: "Bad owner or permissions on ~/.ssh/config"
error_full: |
  Bad owner or permissions on /home/me/.ssh/config
  fatal: Could not read from remote repository.

  Please make sure you have the correct access rights
  and the repository exists.
cat: ssh
description: "OpenSSH refuses to read a config file that other users could modify, or that isn't owned by you (or root). Fix the file's owner and mode; on Windows, fix the ACL."
tldr: "On Linux/macOS: `chown $USER ~/.ssh/config && chmod 600 ~/.ssh/config` and `chmod 700 ~/.ssh`. On Windows, remove other users' access: `icacls %USERPROFILE%\\.ssh\\config /inheritance:r /grant:r \"%USERNAME%:F\"`."
keywords: ssh bad owner or permissions on .ssh/config chmod 600 chown 700 .ssh windows icacls openssh git could not read from remote repository wsl permissions config file
related: [ssh-unprotected-private-key-file, ssh-permission-denied-publickey, git-could-not-read-from-remote-repository]
---
## What it means

Before using `~/.ssh/config`, ssh checks that it's owned by you (or root) and that **no one else can write to it** (no group- or world-write bit). The config can set `ProxyCommand`, which runs arbitrary commands, so a writable config would let another user run code as you. If the check fails, ssh exits immediately — and Git reports it as `Could not read from remote repository`.

Check:

```bash
ls -la ~/.ssh/config ~/.ssh
id -un
```

## Fix 1: Linux and macOS

```bash
chown "$USER" ~/.ssh/config
chmod 600 ~/.ssh/config     # 644 is also accepted; no group/other write
chmod 700 ~/.ssh
```

Strictly, ssh only rejects write access for group/others, but `600` is the safe default. Fix private keys at the same time (`chmod 600 ~/.ssh/id_*`, public keys can be `644`). The [chmod calculator](/tools/chmod-calculator/) explains what each mode allows.

If the file was created with `sudo` (common when following tutorials), it's owned by root but sitting in your home directory — the `chown` above fixes it.

## Fix 2: Windows (OpenSSH for Windows)

Windows OpenSSH checks the file's ACL: only your user, `SYSTEM` and `Administrators` may have access. Inherited permissions often add `Users` or `Authenticated Users`. In **cmd**:

```bat
icacls "%USERPROFILE%\.ssh\config" /inheritance:r
icacls "%USERPROFILE%\.ssh\config" /grant:r "%USERNAME%:F"
icacls "%USERPROFILE%\.ssh\config" /grant:r "SYSTEM:F"
```

In **PowerShell**, replace `%USERPROFILE%` with `$env:USERPROFILE` and `%USERNAME%` with `$env:USERNAME`. Or via Explorer: *Properties → Security → Advanced → Disable inheritance → Remove all inherited permissions*, then add only your user with Full control.

Verify with `icacls "%USERPROFILE%\.ssh\config"`.

## Fix 3: WSL using files on the Windows drive

Files on `/mnt/c/...` show as `777` by default, and `chmod` has no effect unless metadata is enabled. Either keep your SSH files in the Linux home (`~/.ssh` inside WSL), or enable metadata in `/etc/wsl.conf`:

```ini
[automount]
options = "metadata,umask=22,fmask=11"
```

Run `wsl --shutdown`, reopen, then `chmod 600` works. A symlink from `~/.ssh` to the Windows profile folder causes the same problem.

## Fix 4: config mounted into a container

Mounting `~/.ssh` into Docker or a dev container can change ownership to a different UID. Copy the files in and fix owner/permissions, or mount read-only and run ssh as the same UID that owns them.

## Using a different config file

To test whether the config itself is the problem, bypass it:

```bash
ssh -F /dev/null -v git@github.com
```

If that works, the issue is only the config file's ownership/permissions.
