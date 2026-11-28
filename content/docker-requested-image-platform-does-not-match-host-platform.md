---
error: "WARNING: The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8)"
error_full: |
  WARNING: The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8) and no specific platform was requested
cat: docker
description: "The image you are running was built only for another CPU architecture than your machine (typically amd64 images on an Apple Silicon Mac or ARM server). Docker will try to run it under emulation, which is slow or fails with exec format error."
tldr: "Use an image (or tag) that publishes your architecture, check with `docker buildx imagetools inspect IMAGE`. Build your own image for both platforms with `docker buildx build --platform linux/amd64,linux/arm64 -t you/app --push .`. If you really need the amd64 image, request it explicitly with `--platform linux/amd64` (or `platform: linux/amd64` in Compose)."
keywords: docker requested image's platform linux/amd64 does not match the detected host platform linux/arm64/v8 apple silicon m1 m2 m3 arm64 buildx multi-arch emulation qemu --platform
related: [docker-exec-format-error, docker-no-matching-manifest, docker-compose-no-configuration-file-provided]
---
## What it means

Images are built for a specific OS/CPU combination (`linux/amd64`, `linux/arm64`, ...). A multi-arch image has a manifest list and Docker picks the variant matching your host. This warning means the image only has a variant for a different architecture, so Docker pulled that one anyway.

What happens next depends on your setup:

- **Docker Desktop (Mac/Windows)** has emulation built in, so the container usually runs, just slower, and some programs crash under emulation.
- **Plain Linux** without QEMU binfmt handlers fails with `exec format error`.

See which platforms an image provides:

```bash
docker buildx imagetools inspect nginx:latest
docker image inspect --format '{{.Os}}/{{.Architecture}}' myimage
```

## Fix 1: use a multi-arch image or tag

Most official images (`node`, `python`, `postgres`, `nginx`, ...) are multi-arch. If you pinned a tag or a third-party image that is amd64-only, look for an arm64 tag or an alternative image. For databases check the vendor's docs: some publish arm64 only for newer versions.

## Fix 2: build your own image for both architectures

If the image is yours, it was probably built on an amd64 CI runner or laptop. Build and push a multi-arch image with buildx:

```bash
docker buildx create --use              # once, creates a builder that supports multi-platform
docker buildx build --platform linux/amd64,linux/arm64 -t you/app:1.0 --push .
```

For a single local image for your machine only, `docker build .` on that machine is enough.

## Fix 3: run the foreign image on purpose

If there is no native version, ask for the platform explicitly. This silences the warning and makes the choice visible:

```bash
docker run --platform linux/amd64 some/amd64-only-image
```

In Compose:

```yaml
services:
  legacy:
    image: some/amd64-only-image
    platform: linux/amd64
```

You can also set a default for the shell session with `export DOCKER_DEFAULT_PLATFORM=linux/amd64`, but that affects every pull and build, so prefer the per-service setting. You can convert an existing `docker run` command with the [docker run to compose converter](/tools/docker-run-to-compose/).

## Fix 4: enable emulation on Linux

On a Linux host, register QEMU binfmt handlers so foreign binaries can run:

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

Emulated containers are much slower; use this for testing and building, not production.

## Fix 5: Dockerfile FROM picks the wrong platform

A `FROM --platform=linux/amd64 ...` line in a Dockerfile forces amd64 even on arm64 hosts. Remove it, or use the build arguments buildx provides:

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.22 AS build
ARG TARGETOS TARGETARCH
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /app .
```
