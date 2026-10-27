---
error: "no space left on device (Docker)"
error_full: |
  failed to register layer: write /usr/lib/x86_64-linux-gnu/libLLVM.so: no space left on device
cat: docker
description: Docker has filled the disk with old images, containers, volumes and build cache. Check usage with docker system df and prune.
tldr: "Run `docker system df` to see what's using space, then `docker system prune` (add `-a` to also remove unused images, `--volumes` for unused volumes) and `docker builder prune`."
keywords: docker no space left on device prune images build cache overlay2 disk full var lib docker
related: [linux-no-space-left-on-device]
---
## What it means

The filesystem holding Docker's data (`/var/lib/docker` on Linux, a virtual disk on Docker Desktop) is full.

## Step 1: see what's using space

```bash
docker system df
```

## Step 2: clean up

```bash
docker container prune      # stopped containers
docker image prune -a       # images not used by any container
docker builder prune        # build cache (often the biggest)
docker volume prune         # unused volumes — check first, this deletes data!
```

Or all at once:

```bash
docker system prune -a
```

`--volumes` also removes unused volumes. Make sure no database you care about lives in one.

## Step 3: check the host disk

```bash
df -h /var/lib/docker
sudo du -sh /var/lib/docker/*
```

Large container logs are a hidden culprit. Find them:

```bash
sudo du -sh /var/lib/docker/containers/*/*-json.log | sort -h | tail
```

Limit log size in `/etc/docker/daemon.json` and restart Docker:

```json
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
```

## Docker Desktop (macOS / Windows)

The virtual disk has a fixed maximum. After pruning, raise the limit in *Settings → Resources → Disk image size* if needed.

## Inodes

If `df -h` shows free space but you still get the error, check inodes with `df -i`. Millions of small files in images or volumes can use them up; pruning helps here too.

## Move Docker's data directory

If the root partition is small, put Docker on a bigger disk by setting `"data-root": "/mnt/big/docker"` in `daemon.json`, stop Docker, copy `/var/lib/docker` there, and start it again.
