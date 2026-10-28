---
error: "E: Unable to locate package"
error_full: |
  Reading package lists... Done
  Building dependency tree... Done
  E: Unable to locate package python3.12-venv
cat: linux
description: apt doesn't know the package name. The package lists are outdated, the name is misspelled, the needed repository (universe, a PPA) isn't enabled, or the package doesn't exist for your Ubuntu/Debian release.
tldr: "Run `sudo apt update` first. Then search the real name with `apt search <name>` or `apt-cache policy <name>`. On Ubuntu, enable universe: `sudo add-apt-repository universe && sudo apt update`."
keywords: e unable to locate package apt-get install ubuntu debian apt update universe repository ppa package name docker wsl
related: [linux-could-not-get-lock-dpkg, linux-command-not-found]
---
## What it means

`apt install foo` looks `foo` up in the local package lists downloaded by `apt update`. If no enabled repository lists that exact name, you get this error.

## Fix 1: update the package lists

Fresh containers, WSL installs and cloud images often have empty lists:

```bash
sudo apt update
sudo apt install <package>
```

In a Dockerfile, combine them in one layer:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
```

## Fix 2: check the exact name

```bash
apt search ripgrep
apt-cache policy python3.12-venv
```

Common mix-ups: `python` vs `python3`, `pip` vs `python3-pip`, `node` vs `nodejs`, `docker` vs `docker.io`, `fd` vs `fd-find`. Package names are lowercase.

## Fix 3: enable the right repository

Many packages live in Ubuntu's *universe* component:

```bash
sudo add-apt-repository universe
sudo apt update
```

Third-party software (Docker CE, newer Node, PHP versions) needs its vendor's repository or a PPA added first, following the vendor's install docs.

## Fix 4: the package isn't available for your release

Versions are tied to releases: `python3.12` exists on Ubuntu 24.04 but not 20.04. Check your release:

```bash
lsb_release -a
```

Search packages.ubuntu.com or packages.debian.org to see which releases have it. Alternatives: a PPA (e.g. deadsnakes for Python), the vendor's .deb, Snap/Flatpak, or a newer OS.

## Fix 5: end-of-life release

On an unsupported Ubuntu, `apt update` fails with 404s and lists become empty. Point sources at `old-releases.ubuntu.com` or, better, upgrade.
