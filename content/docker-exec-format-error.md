---
error: "exec format error"
error_full: |
  exec /usr/local/bin/docker-entrypoint.sh: exec format error
cat: docker
description: The container's binary was built for a different CPU architecture (arm64 vs amd64), or the script has no valid shebang line.
tldr: "Architecture mismatch: build for the target platform with `docker buildx build --platform linux/amd64 ...` (or arm64). Script: make sure the first line is a shebang like `#!/bin/sh` and the file uses Unix line endings."
keywords: exec format error docker arm64 amd64 apple silicon m1 raspberry pi platform buildx entrypoint shebang
related: [linux-bad-interpreter-no-such-file]
---
## What it means

The Linux kernel was asked to run a file it can't execute. Inside containers that almost always means one of two things.

## Cause 1: wrong CPU architecture

An image built on an Apple Silicon Mac (arm64) won't run on a typical x86-64 server, and an amd64 image won't run on a Raspberry Pi.

Check the image's architecture:

```bash
docker image inspect myimage --format '{{.Os}}/{{.Architecture}}'
uname -m        # on the machine that runs it: x86_64 = amd64, aarch64 = arm64
```

Build for the right platform:

```bash
docker buildx build --platform linux/amd64 -t myimage:latest .
# or a multi-platform image (requires pushing to a registry):
docker buildx build --platform linux/amd64,linux/arm64 -t user/myimage:latest --push .
```

In Compose, add `platform: linux/amd64` to the service.

## Cause 2: a script without a valid shebang

If the entrypoint is a shell script, its first line must say which interpreter to use:

```sh
#!/bin/sh
```

Also check:

- **Windows line endings.** A script saved with CRLF makes the shebang `#!/bin/sh\r`. Convert with `sed -i 's/\r$//' docker-entrypoint.sh` or `dos2unix`, and add `*.sh text eol=lf` to `.gitattributes`.
- **A byte-order mark (BOM)** before `#!` breaks it too. Save the file as UTF-8 without BOM.
- **The interpreter exists in the image.** Alpine has no `bash` by default; use `#!/bin/sh` or `apk add bash`.

## Outside Docker

The same error on a normal Linux machine means you downloaded a binary for the wrong architecture (for example an arm64 release on an x86 server). Download the build that matches `uname -m`.
