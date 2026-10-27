---
error: "E: Could not get lock /var/lib/dpkg/lock-frontend"
error_full: |
  E: Could not get lock /var/lib/dpkg/lock-frontend. It is held by process 2481 (unattended-upgr)
  N: Be aware that removing the lock file is not a solution and may break your system.
  E: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), is another process using it?
cat: linux
description: Another apt or dpkg process is running — usually automatic updates right after boot. Wait for it to finish rather than deleting lock files.
tldr: "Wait a few minutes: it's usually `unattended-upgrades` or another apt window. Check with `ps aux | grep -E 'apt|dpkg'`. If no apt process is running at all, run `sudo dpkg --configure -a`."
keywords: could not get lock var lib dpkg lock-frontend unable to acquire dpkg frontend lock held by process unattended-upgr apt ubuntu
related: [linux-no-space-left-on-device]
---
## What it means

Only one package manager can change the system at a time. The lock is held by another process, named in the message (`unattended-upgr` = automatic security updates, `apt`, `apt-get`, `packagekitd` = Software Center).

## Fix 1: wait

On a freshly booted machine, automatic updates often run for a few minutes. Wait and watch:

```bash
ps aux | grep -E '[a]pt|[d]pkg'
# or wait until the lock is free:
while sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do sleep 5; done
```

Close other terminals running apt and the Software Updater GUI.

## Fix 2: the other process is stuck

If the process has been running for a long time with no CPU or disk activity, stop it gracefully:

```bash
sudo kill <PID>          # PID from the message
```

Then repair any interrupted installation:

```bash
sudo dpkg --configure -a
sudo apt -f install
```

## Don't delete the lock files first

Removing `/var/lib/dpkg/lock*` while another process is really writing can corrupt the package database. Only if **no** apt/dpkg process exists (`ps` shows nothing) and the error remains after a reboot, remove the stale locks and repair:

```bash
sudo rm /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock
sudo dpkg --configure -a
```

## In scripts and cloud-init

Wait for the lock instead of failing. apt has a built-in option:

```bash
sudo apt-get -o DPkg::Lock::Timeout=300 install -y nginx
```
