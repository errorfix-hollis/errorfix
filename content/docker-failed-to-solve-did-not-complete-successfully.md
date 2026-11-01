---
error: "failed to solve: process \"/bin/sh -c ...\" did not complete successfully: exit code: 1"
error_full: |
  ERROR: failed to solve: process "/bin/sh -c npm install" did not complete successfully: exit code: 1
  ERROR: failed to solve: process "/bin/sh -c apt-get install -y libpq-dev" did not complete successfully: exit code: 100
  ERROR: failed to solve: process "/bin/sh -c pip install -r requirements.txt" did not complete successfully: exit code: 1
cat: docker
description: A RUN instruction in your Dockerfile returned a non-zero exit code, so BuildKit stopped the build. The real error is printed above this line, in the output of that step.
tldr: "Scroll up to the failing step's own output (or rebuild with `docker build --progress=plain --no-cache .`) and fix that error. Common ones: run `apt-get update` in the same RUN as `apt-get install -y`, copy `package-lock.json`/`requirements.txt` before installing, use a base image with the needed tools, and check the command exists in slim/alpine images."
keywords: docker build failed to solve process /bin/sh -c did not complete successfully exit code 1 100 127 buildkit run npm install pip install apt-get
related: [docker-build-copy-failed-file-not-found, docker-no-space-left-on-device, docker-exec-format-error]
---
## What it means

Each `RUN` line runs a shell command inside the build container. If it exits with anything but 0, the build fails with this generic message. The message only tells you **which** command failed and its exit code; the reason is in that command's output just above.

Get the full output, uncollapsed and uncached:

```bash
docker build --progress=plain --no-cache -t myapp . 2>&1 | tee build.log
```

The exit code is a hint:

| Code | Usually means |
|------|---------------|
| 1 | the tool itself failed (npm/pip/compiler error) |
| 2 | misuse / make error |
| 100 | apt-get failed (package not found, stale index) |
| 127 | command not found in the image |
| 137 | killed, usually out of memory |

## Cause 1: apt-get (exit code 100)

`E: Unable to locate package` or 404s happen when the package index is missing or cached from an old layer. Always update and install in the same `RUN`:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*
```

Check the package name exists for the base image's distro version (Debian names differ from Ubuntu sometimes). On Alpine use `apk add --no-cache ...` instead.

## Cause 2: command not found (exit code 127)

Slim and Alpine images lack many tools (`curl`, `git`, `bash`, `make`, `gcc`). Install them first, or pick a fuller base image. Alpine has no `bash` by default; use `sh` or `apk add bash`.

## Cause 3: npm install / npm ci fails

- `npm ci` requires `package-lock.json`. Copy it before installing:

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
```

- Native modules (`node-gyp`, `bcrypt`, `sharp`) need build tools: `apk add --no-cache python3 make g++` on Alpine.
- `ERESOLVE` peer dependency errors: fix the dependency, or `npm ci --legacy-peer-deps` as a stopgap.
- Add `node_modules` to `.dockerignore` so your host's modules don't get copied over.

## Cause 4: pip install fails

- `Failed building wheel` on slim/alpine: install compilers and headers (`gcc`, `python3-dev`/`musl-dev`, `libpq-dev`), or use the non-Alpine `python:3.x-slim` where most packages have prebuilt wheels.
- A pinned version not available for that Python version: match the base image's Python to what your requirements support.

## Cause 5: killed for memory (exit code 137)

Builds of large frontends or compiled languages can exhaust Docker's memory. Increase memory in Docker Desktop settings, or limit the tool (`NODE_OPTIONS=--max-old-space-size=4096`, `cargo build -j 2`).

## Cause 6: wrong architecture

Building an `amd64` image on Apple Silicon (or vice versa) can make downloaded binaries fail with `exec format error`. Set the platform explicitly: `docker build --platform linux/amd64 .`

## Debugging tip

Comment out the failing `RUN` and everything after it, build, then open a shell in that image and run the command by hand:

```bash
docker build -t debug .
docker run --rm -it debug sh
```
