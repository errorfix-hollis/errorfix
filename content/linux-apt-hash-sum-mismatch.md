---
error: "E: Failed to fetch ... Hash Sum mismatch"
error_full: |
  E: Failed to fetch http://archive.ubuntu.com/ubuntu/dists/jammy-updates/main/binary-amd64/by-hash/SHA256/3f1c...  Hash Sum mismatch
     Hashes of expected file:
      - SHA256:3f1c9a...
     Hashes of received file:
      - SHA256:a07be2...
  E: Some index files failed to download. They have been ignored, or old ones used instead.
cat: linux
description: "The file apt downloaded doesn't match the checksum listed in the repository's Release file. Usually a mirror is mid-sync, a proxy/cache served a stale or altered file, or the local lists are corrupt."
tldr: "Clear the cached lists and retry: `sudo rm -rf /var/lib/apt/lists/* && sudo apt-get clean && sudo apt-get update`. If it keeps failing, wait a few minutes (mirror sync), switch to another mirror in /etc/apt/sources.list, or bypass a caching proxy. For Docker builds, add `--no-cache`."
keywords: apt hash sum mismatch failed to fetch apt-get update ubuntu debian mirror sync proxy cache var lib apt lists by-hash some index files failed to download docker
related: [linux-e-unable-to-locate-package, linux-dpkg-returned-an-error-code-1, linux-could-not-get-lock-dpkg]
---
## What it means

Every apt repository publishes a signed `Release`/`InRelease` file listing the SHA256 of each index (`Packages`, `Sources`, ...) and every `.deb`. apt downloaded a file whose hash differs from the expected one, so it refuses to use it. That's a safety feature: the file is incomplete, stale or tampered with.

It is almost never your fault, and almost never fixed by retrying `apt-get install` with flags.

## Fix 1: clear the lists and update again

```bash
sudo rm -rf /var/lib/apt/lists/*
sudo apt-get clean
sudo apt-get update
```

This removes partially downloaded or corrupt index files. Re-run `apt-get install` afterwards.

## Fix 2: the mirror is in the middle of syncing

Mirrors update every few hours. During a sync the `Release` file and the indexes can briefly disagree. Wait 10–30 minutes and retry, or switch mirror. On Ubuntu edit `/etc/apt/sources.list` (or `/etc/apt/sources.list.d/ubuntu.sources` on 24.04+):

```bash
sudo sed -i 's|http://[a-z]*\.\?archive.ubuntu.com|http://archive.ubuntu.com|g' /etc/apt/sources.list
sudo apt-get update
```

Country mirrors like `de.archive.ubuntu.com` lag more often than the main archive. On Debian, `deb.debian.org` is a CDN and usually a good default.

## Fix 3: a proxy or cache altered the file

Transparent proxies, corporate filters, apt-cacher-ng and some hotel/office networks serve cached or modified responses. Signs: it fails on one network and works on another. Options:

- Use HTTPS sources (`https://archive.ubuntu.com/ubuntu` needs `apt-transport-https` on old releases; it's built in since apt 1.5), which proxies can't rewrite.
- Tell apt to bypass caches:

```bash
sudo apt-get update -o Acquire::http::No-Cache=true -o Acquire::http::Pipeline-Depth=0
```

- Check for a configured proxy: `grep -ri proxy /etc/apt/apt.conf /etc/apt/apt.conf.d/`.

## Fix 4: Docker builds

A cached `RUN apt-get update` layer can be old while a later install step fetches new files. Always combine them in one `RUN` and clean up:

```dockerfile
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
```

Rebuild with `docker build --no-cache .`. On Docker Desktop/WSL with a flaky network, the same proxy issues as Fix 3 apply.

## Fix 5: disk or memory problems

If the mismatch moves between different files on every attempt, on every mirror, suspect the local machine: a full disk (`df -h /var`), bad RAM, or a failing drive. Run `sudo apt-get check` and check `dmesg` for I/O errors.

## Don't

Don't disable verification (`Acquire::Check-Valid-Until` or `--allow-unauthenticated` are for different errors and don't fix hash mismatches anyway). The mismatch means the data is wrong; get a correct copy.
