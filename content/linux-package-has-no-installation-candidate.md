---
error: "E: Package 'X' has no installation candidate"
error_full: |
  Package python-pip is not available, but is referred to by another package.
  This may mean that the package is missing, has been obsoleted, or
  is only available from another source
  
  E: Package 'python-pip' has no installation candidate
cat: linux
description: "APT knows the package name (something references it) but no enabled repository offers an installable version. The package was renamed or removed in your release, the package lists are stale, or the repository/architecture is missing."
tldr: "Run `sudo apt update` first. Then check `apt-cache policy PACKAGE` and `apt search NAME` for the new name (e.g. `python3-pip` instead of `python-pip`, `libgl1` instead of `libgl1-mesa-glx`). Enable the universe repo with `sudo add-apt-repository universe` if needed, or add the vendor's repository."
keywords: linux apt e package has no installation candidate is not available but is referred to by another package obsoleted apt-get install ubuntu debian python-pip libgl1-mesa-glx universe apt-cache policy
related: [linux-e-unable-to-locate-package, linux-apt-no-pubkey, linux-dpkg-returned-an-error-code-1]
---
## What it means

APT has the name in its database (because another package mentions it, or it existed in an older index), but there is no version it could install from your current sources. Compare with `E: Unable to locate package`, where APT has never heard of the name at all.

Inspect it:

```bash
apt-cache policy python-pip
#   Installed: (none)
#   Candidate: (none)      <- no repository offers it
apt-cache showpkg python-pip   # who refers to it / what replaces it
```

## Cause 1: package lists not updated

Typical in fresh Docker images and new servers, where `/var/lib/apt/lists` is empty:

```bash
sudo apt update
sudo apt install PACKAGE
```

In a Dockerfile, always combine them in one layer:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends python3-pip \
    && rm -rf /var/lib/apt/lists/*
```

## Cause 2: the package was renamed or dropped

Old tutorials use names that no longer exist in current Ubuntu/Debian:

| Old name | Use instead |
|---|---|
| `python-pip`, `python-dev` | `python3-pip`, `python3-dev` |
| `python` | `python3` (or `python-is-python3`) |
| `libgl1-mesa-glx` | `libgl1` |
| `mysql-server` (Debian) | `default-mysql-server` (MariaDB) |
| `openjdk-8-jdk` (newer releases) | `openjdk-17-jdk` / `openjdk-21-jdk` |
| `docker-compose` (v1) | `docker-compose-plugin` from Docker's repo (`docker compose`) |

Search for the current name:

```bash
apt search --names-only pip
apt-file search bin/pip3     # which package ships a file (sudo apt install apt-file && sudo apt-file update)
```

You can also check packages.ubuntu.com or packages.debian.org for your release.

## Cause 3: the repository component is disabled

On Ubuntu many packages live in `universe` or `multiverse`:

```bash
sudo add-apt-repository universe
sudo apt update
```

On Debian, `non-free`/`non-free-firmware` and `contrib` must be listed in `/etc/apt/sources.list` (or `/etc/apt/sources.list.d/debian.sources`).

## Cause 4: the software comes from a vendor repository

Packages like `docker-ce`, `google-chrome-stable`, `code`, `nodejs` (current versions), `mongodb-org` and `terraform` are not in the default repos. Follow the vendor's install guide to add their repository and signing key, then `sudo apt update`. If `apt update` shows a `NO_PUBKEY` error for that repo, fix the key first (see related page).

## Cause 5: wrong architecture or release

- On ARM (Raspberry Pi, Apple Silicon VMs), some packages exist only for `amd64`. Check with `dpkg --print-architecture`.
- A PPA or vendor repo may not publish packages for your release yet (e.g. a brand-new Ubuntu version). Check the repo's `dists/` folder for your codename (`lsb_release -cs`).
- End-of-life releases are moved to `old-releases.ubuntu.com`; `apt update` then shows 404 errors.
