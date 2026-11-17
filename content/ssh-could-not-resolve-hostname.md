---
error: "ssh: Could not resolve hostname: Name or service not known"
error_full: |
  ssh: Could not resolve hostname myserver: Name or service not known
  ssh: Could not resolve hostname github.com: Temporary failure in name resolution
  ssh: Could not resolve hostname example.com: nodename nor servname provided, or not known
cat: ssh
description: "ssh couldn't turn the host part of the command into an IP address. Usually a typo or wrong command syntax, a Host alias missing from ~/.ssh/config, or broken DNS on the client."
tldr: "Check the syntax is `ssh user@host` (no `https://`, no `:path`) and the name resolves: `getent hosts myserver` or `nslookup myserver`. Use the IP directly, add a `Host` block with `HostName` to `~/.ssh/config`, or fix DNS (`/etc/resolv.conf`). 'Temporary failure' means DNS on your machine is down."
keywords: ssh could not resolve hostname name or service not known temporary failure in name resolution nodename nor servname provided ssh config host alias dns git clone
related: [ssh-connection-timed-out, ssh-connect-to-host-port-22-connection-refused, linux-temporary-failure-in-name-resolution]
---
## What it means

Before connecting, ssh resolves the hostname with the system resolver (`/etc/hosts`, DNS, mDNS). The three wordings come from the OS:

- **Name or service not known** (Linux) / **nodename nor servname provided, or not known** (macOS): the name doesn't exist anywhere the resolver looked.
- **Temporary failure in name resolution**: DNS servers couldn't be reached at all - a network/DNS problem on your machine.

The name ssh tried is printed in the message. Look at it closely: often it's not what you think.

## Cause 1: wrong command syntax

```bash
ssh https://example.com          # "Could not resolve hostname https"
ssh me@example.com:2222          # tries to resolve "example.com:2222"
ssh me@example.com/home/me       # tries "example.com/home/me"
```

## Fix 1: plain host, port with `-p`

```bash
ssh me@example.com
ssh -p 2222 me@example.com
ssh ssh://me@example.com:2222    # URL form is also accepted
```

For `scp`/`rsync`, the path goes after a colon: `scp file.txt me@example.com:/home/me/`.

## Cause 2: alias not in `~/.ssh/config`

`ssh myserver` only works if `myserver` is defined:

```
Host myserver
    HostName 203.0.113.10
    User deploy
    Port 22
    IdentityFile ~/.ssh/id_ed25519
```

Check what ssh actually resolves to:

```bash
ssh -G myserver | grep -i '^hostname'
```

Common mistakes: `Hostname` typed under the wrong `Host` block, config file at the wrong path (must be `~/.ssh/config`, no extension), or running with `sudo` (root reads `/root/.ssh/config`, not yours).

## Cause 3: the name doesn't exist in DNS

```bash
getent hosts example.com      # what ssh will see (Linux)
nslookup example.com
dig +short example.com @1.1.1.1
```

If public DNS doesn't know it either, fix the DNS record or use the IP: `ssh me@203.0.113.10`. For machines on your LAN without DNS, add them to `/etc/hosts`:

```
192.168.1.50   nas
```

or use mDNS names like `raspberrypi.local` (needs Avahi on Linux, built into macOS).

## Cause 4: VPN / internal hostnames

Internal names (e.g. `db01.corp.internal`) only resolve while the VPN is connected and its DNS is in use. Reconnect, or check `resolvectl status` to see which DNS server handles that domain.

## Cause 5: "Temporary failure in name resolution"

DNS is broken on the client - test with `ping 1.1.1.1` (network OK?) and `ping google.com` (DNS OK?). See [Temporary failure in name resolution](/linux/linux-temporary-failure-in-name-resolution/) for fixing `/etc/resolv.conf` / systemd-resolved, WSL and Docker.

## Git over SSH

`git clone git@github.com:user/repo.git` failing with `Could not resolve hostname github.com` is the same DNS problem. If you use an alias such as `git@github-work:user/repo.git`, that `Host github-work` block must exist in `~/.ssh/config` with `HostName github.com`.

## ProxyJump hosts

With `ProxyJump bastion`, the target hostname is resolved **on the bastion**, not locally. A name that resolves on your laptop may fail there - use an IP or a name the bastion knows.
