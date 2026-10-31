---
error: "standard_init_linux.go: exec user process caused: no such file or directory"
error_full: |
  standard_init_linux.go:228: exec user process caused: no such file or directory
  exec /usr/local/bin/docker-entrypoint.sh: no such file or directory
cat: docker
description: The container's entrypoint exists, but the kernel can't run it because its interpreter (from the shebang line) or dynamic loader is missing. Usually Windows CRLF line endings, a bash script on an image without bash, or a glibc binary on Alpine.
tldr: "Convert the script to LF line endings (`sed -i 's/\\r$//' entrypoint.sh` or `dos2unix`), make sure the shebang's interpreter exists in the image (`#!/bin/sh` on Alpine), and don't copy glibc-linked binaries into Alpine — build with `CGO_ENABLED=0` or use a Debian-based image."
keywords: docker standard_init_linux.go exec user process caused no such file or directory entrypoint crlf shebang alpine bash dos2unix exec format
related: [docker-exec-format-error, linux-bad-interpreter-no-such-file, docker-oci-runtime-create-failed-executable-file-not-found]
---
## What it means

The confusing part: the file named in `ENTRYPOINT`/`CMD` usually **does** exist. "No such file or directory" refers to what the kernel needs to *run* it:

- for a script, the interpreter in the `#!` line;
- for a dynamically linked binary, its loader (e.g. `/lib64/ld-linux-x86-64.so.2`).

Newer Docker versions print `exec /path/to/file: no such file or directory` for the same problem.

## Cause 1: Windows line endings (CRLF)

If the script was saved on Windows, the shebang is really `#!/bin/sh\r`, and `/bin/sh\r` doesn't exist. Check:

```bash
file entrypoint.sh          # "... with CRLF line terminators"
```

Fix the file, then rebuild:

```bash
sed -i 's/\r$//' entrypoint.sh     # or: dos2unix entrypoint.sh
```

Or fix it inside the Dockerfile so it can't come back:

```dockerfile
COPY entrypoint.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh
```

To stop Git converting it on Windows checkouts, add to `.gitattributes`:

```
*.sh text eol=lf
```

## Cause 2: the interpreter isn't in the image

Alpine and distroless images have no `bash`. A script starting with `#!/bin/bash` fails with this error.

```dockerfile
# Option A: use sh
#!/bin/sh
# Option B: install bash on Alpine
RUN apk add --no-cache bash
```

Same for `#!/usr/bin/env python3` in an image without Python.

## Cause 3: glibc binary on Alpine (musl)

A binary compiled on Ubuntu/Debian and copied into `alpine` or `scratch` needs glibc's loader, which isn't there. Check on the host:

```bash
file ./myapp     # "dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2"
```

Fixes:

```bash
# Go: build a static binary
CGO_ENABLED=0 GOOS=linux go build -o myapp .
```

Or build in the same base image you run in (multi-stage with `golang:alpine` → `alpine`), or run on `debian:bookworm-slim` / `gcr.io/distroless/base` instead.

## Cause 4: the path really is wrong

Check what's actually in the image:

```bash
docker run --rm --entrypoint sh myimage -c 'ls -l /usr/local/bin/'
```

Watch out for a volume mount (`-v .:/app`) hiding files that the image put at the same path.

## Cause 5: wrong CPU architecture

An `amd64` image run on an ARM machine (or vice versa) without emulation usually gives `exec format error`, but some setups report this message. Check with `docker image inspect myimage --format '{{.Architecture}}'` and rebuild with `docker buildx build --platform linux/arm64,linux/amd64`.
