---
error: "E: Sub-process /usr/bin/dpkg returned an error code (1)"
error_full: |
  Errors were encountered while processing:
   mysql-server-8.0
  E: Sub-process /usr/bin/dpkg returned an error code (1)
cat: linux
description: "apt handed packages to dpkg and dpkg failed while unpacking or configuring one of them. The real error is a few lines above; usually a broken post-install script, an interrupted install, or a file conflict between packages."
tldr: "Scroll up for the package named in 'Errors were encountered while processing'. Then run `sudo dpkg --configure -a` and `sudo apt-get install -f`. If a package's maintainer script keeps failing, fix the underlying service problem or purge it: `sudo apt-get purge PACKAGE && sudo apt-get autoremove`. For file conflicts use `sudo dpkg -i --force-overwrite /var/cache/apt/archives/PKG.deb`."
keywords: linux ubuntu debian e sub-process /usr/bin/dpkg returned an error code 1 errors were encountered while processing dpkg configure -a apt install -f post-installation script trying to overwrite
related: [linux-could-not-get-lock-dpkg, linux-e-unable-to-locate-package, linux-no-space-left-on-device]
---
## What it means

`apt` downloads packages, then calls `dpkg` to unpack and configure them. Exit code 1 from dpkg just means "something failed". The useful information is earlier in the output:

```
Setting up mysql-server-8.0 (8.0.39-0ubuntu0.24.04.1) ...
Job for mysql.service failed because the control process exited with error code.
dpkg: error processing package mysql-server-8.0 (--configure):
 installed mysql-server-8.0 package post-installation script subprocess returned error exit status 1
Errors were encountered while processing:
 mysql-server-8.0
```

Find the `dpkg: error processing package` line - it tells you the package and the phase.

## Fix 1: finish interrupted installs

If an earlier `apt` was killed (closed terminal, reboot, out of disk), packages are left half-configured:

```bash
sudo dpkg --configure -a
sudo apt-get install -f
sudo apt-get update && sudo apt-get upgrade
```

Check disk space too (`df -h /`); a full disk causes exactly this.

## Cause 2: a package's post-install script fails

`post-installation script subprocess returned error exit status 1` means the package's own setup script failed - often because the service it installs can't start (port in use, broken config file, missing directory). Look at the service:

```bash
sudo systemctl status mysql
sudo journalctl -xeu mysql --no-pager | tail -50
```

Fix the cause (free the port, repair the config in `/etc/...`), then re-run `sudo dpkg --configure -a`.

## Fix 2: purge and reinstall the package

If you don't need the package's existing config/data:

```bash
sudo apt-get purge mysql-server-8.0
sudo apt-get autoremove
sudo apt-get install mysql-server
```

Warning: purging database server packages can remove their configuration, and some prompt about deleting data directories - back up first.

## Fix 3: the maintainer script itself is broken

If the script fails no matter what and purging fails for the same reason, inspect the scripts in `/var/lib/dpkg/info/`:

```bash
ls /var/lib/dpkg/info/ | grep PACKAGE
```

As a last resort, move the failing script aside (e.g. `PACKAGE.postinst`, `PACKAGE.prerm`) and retry:

```bash
sudo mv /var/lib/dpkg/info/PACKAGE.postinst /tmp/
sudo dpkg --configure -a
```

This skips the package's setup steps, so only do it to remove a package or when you know what the script would do.

## Cause 4: file conflict between packages

```
dpkg: error processing archive /var/cache/apt/archives/foo_2.0_amd64.deb (--unpack):
 trying to overwrite '/usr/lib/x86_64-linux-gnu/libfoo.so', which is also in package bar 1.0
```

Usually from mixing PPAs or third-party repos. Either remove the other package (`sudo apt-get remove bar`), or force the overwrite once:

```bash
sudo dpkg -i --force-overwrite /var/cache/apt/archives/foo_2.0_amd64.deb
sudo apt-get install -f
```

Then consider removing the PPA that ships the conflicting version.

## Cause 5: locked dpkg

If instead you see `Could not get lock /var/lib/dpkg/lock-frontend`, another apt process is running - see [Could not get lock](/linux/linux-could-not-get-lock-dpkg/).

## Getting more detail

```bash
sudo apt-get install -o Debug::pkgProblemResolver=yes -f
grep -A5 "error" /var/log/dpkg.log | tail -40
less /var/log/apt/term.log
```
