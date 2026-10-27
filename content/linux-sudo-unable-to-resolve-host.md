---
error: "sudo: unable to resolve host"
error_full: "sudo: unable to resolve host myserver: Name or service not known"
cat: linux
description: The machine's hostname isn't listed in /etc/hosts. Add it next to 127.0.1.1 (or 127.0.0.1).
tldr: "Run `hostname` to see the name, then add `127.0.1.1 myserver` to `/etc/hosts` (e.g. `echo \"127.0.1.1 $(hostname)\" | sudo tee -a /etc/hosts`)."
keywords: sudo unable to resolve host name or service not known etc hosts hostname changed ubuntu
related: [linux-command-not-found]
---
## What it means

sudo looks up the machine's own hostname. After changing the hostname (or on some cloud/container images), `/etc/hosts` no longer contains it, so the lookup fails. sudo still works, but prints the warning and may be slow.

## Fix

```bash
hostname
cat /etc/hosts
```

Add the hostname (Debian/Ubuntu use `127.0.1.1` for it):

```bash
echo "127.0.1.1 $(hostname)" | sudo tee -a /etc/hosts
```

Or edit the file and make the line look like:

```text
127.0.0.1   localhost
127.0.1.1   myserver
```

## Changing the hostname properly

```bash
sudo hostnamectl set-hostname newname
```

Then update `/etc/hosts` to match. On cloud VMs, cloud-init may rewrite `/etc/hosts` at boot. Set `manage_etc_hosts: true` in cloud-init config, or edit `/etc/cloud/templates/hosts.debian.tmpl`.

## WSL

WSL regenerates `/etc/hosts` on start. If the name is missing, check `generateHosts` in `/etc/wsl.conf`.
