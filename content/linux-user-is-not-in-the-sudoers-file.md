---
error: "user is not in the sudoers file. This incident will be reported."
error_full: |
  alice is not in the sudoers file.  This incident will be reported.
  alice is not in the sudoers file.
  Sorry, user alice is not allowed to execute '/usr/bin/apt update' as root on myhost.
cat: linux
description: "Your account has no sudo rights: it's not in the `sudo` (Debian/Ubuntu) or `wheel` (Fedora/RHEL/Arch) group and has no rule in /etc/sudoers. Someone with root access has to add it."
tldr: "Become root (`su -` with the root password, or a recovery shell), then add the user to the admin group: `usermod -aG sudo alice` (Debian/Ubuntu) or `usermod -aG wheel alice` (Fedora/RHEL/Arch, make sure `%wheel ALL=(ALL:ALL) ALL` is enabled via `visudo`). Log out and back in, then check with `groups` and `sudo -l`."
keywords: linux user is not in the sudoers file this incident will be reported usermod -aG sudo wheel visudo su root debian ubuntu fedora arch recovery mode add user to sudoers
related: [linux-sudo-command-not-found, linux-permission-denied-running-script, linux-sudo-unable-to-resolve-host]
---
## What it means

`sudo` checks `/etc/sudoers` and files in `/etc/sudoers.d/` for a rule that lets your user run commands as root. There was none. "This incident will be reported" just means the attempt is logged (to the auth log/journal); nobody gets an email on a typical desktop.

Check what you have:

```bash
id
groups
sudo -l
```

You can't fix this from your own account — by design. You need root another way.

## Step 1: get a root shell

**Root password is set** (common on Debian installed with a root password, where the first user doesn't get sudo):

```bash
su -
```

Use `su -` (with the dash) so root's `PATH` includes `/usr/sbin`, where `usermod` lives.

**Another admin account exists**: log in as that user and use `sudo`.

**No root password, no other admin** (desktop): boot into recovery mode. On Ubuntu hold `Shift` (BIOS) or press `Esc` (UEFI) at boot → *Advanced options* → *(recovery mode)* → *root*. Then remount the disk writable:

```bash
mount -o remount,rw /
```

**WSL**: from Windows run `wsl -u root`.

**Cloud VM / container**: use the provider's console, or `docker exec -u root -it <container> bash`.

## Step 2: add the user to the admin group

Debian, Ubuntu, Mint, Kali:

```bash
usermod -aG sudo alice
```

Fedora, RHEL, CentOS, Rocky, Alma, Arch:

```bash
usermod -aG wheel alice
```

The `-a` is important: `usermod -G wheel alice` without it *replaces* all the user's other groups.

On Arch, the `wheel` rule is commented out by default. Enable it with `EDITOR=nano visudo` and uncomment:

```text
%wheel ALL=(ALL:ALL) ALL
```

On Debian/Ubuntu the `%sudo ALL=(ALL:ALL) ALL` line is already present.

## Alternative: a drop-in rule for one user

```bash
echo 'alice ALL=(ALL:ALL) ALL' > /etc/sudoers.d/alice
chmod 440 /etc/sudoers.d/alice
visudo -c        # validate syntax
```

Always validate — a syntax error in sudoers breaks sudo for everyone. Edit the main file only with `visudo`, never with a plain editor.

## Step 3: log out and back in

Group membership is read at login. Until you start a new session, `groups` won't show `sudo`/`wheel` and sudo still fails. Log out completely (or reboot); for a quick test in the current terminal, `su - alice` or `newgrp sudo`.

Then:

```bash
sudo -v && sudo whoami     # prints: root
```

## Minimal systems without sudo

If `sudo` itself isn't installed you get `sudo: command not found` instead. As root: `apt install sudo` (Debian) or `dnf install sudo`, then follow the steps above.
