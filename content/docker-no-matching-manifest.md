---
error: "no matching manifest for linux/arm64/v8 in the manifest list entries"
error_full: |
  Error response from daemon: no matching manifest for linux/arm64/v8 in the manifest list entries
cat: docker
description: The image you pulled has no build for your CPU architecture (often Apple Silicon / ARM pulling an amd64-only image, or the reverse). Use a multi-arch tag, emulate with --platform, or build the image yourself.
tldr: "Run it under emulation: `docker pull --platform linux/amd64 image:tag` (or `platform: linux/amd64` in docker-compose). Better: use a tag/image that publishes your architecture, or build locally."
keywords: docker no matching manifest for linux/arm64/v8 linux/amd64 in the manifest list entries apple silicon m1 m2 platform buildx multi-arch mysql
related: [docker-exec-format-error, docker-cannot-connect-to-the-docker-daemon]
---
## What it means

Docker images can publish several variants (amd64, arm64, …) under one tag via a *manifest list*. Docker picks the one matching your machine. If there's no variant for your platform, the pull fails.

Check your platform and what the image offers:

```bash
docker info --format '{{.OSType}}/{{.Architecture}}'
docker manifest inspect mysql:5.7 | grep -A2 platform
```

## Fix 1: run the other architecture under emulation

Docker Desktop (Mac/Windows) includes QEMU emulation:

```bash
docker pull --platform linux/amd64 mysql:5.7
docker run --platform linux/amd64 mysql:5.7
```

docker-compose:

```yaml
services:
  db:
    image: mysql:5.7
    platform: linux/amd64
```

On Linux, install emulators first:

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

Emulation works but is slower.

## Fix 2: use an image that supports your architecture

- `mysql:5.7` has no arm64 build; `mysql:8` and `mariadb` do.
- Check Docker Hub's "OS/ARCH" column on the Tags tab.
- Some projects publish separate tags (`-arm64`) or alternative images (e.g. `arm64v8/…`).

## Fix 3: build it yourself for your platform

If you control the Dockerfile, build multi-arch images with buildx:

```bash
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t you/app:latest --push .
```

## Related: running the wrong architecture

If you force the wrong platform without emulation, the container fails with `exec format error`.
