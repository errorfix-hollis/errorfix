---
error: "failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory"
error_full: |
  ERROR: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
  ERROR: failed to solve: failed to read dockerfile: open /var/lib/docker/tmp/buildkit-mount123/Dockerfile: no such file or directory
  unable to prepare context: unable to evaluate symlinks in Dockerfile path: lstat /home/me/app/Dockerfile: no such file or directory
cat: docker
description: "`docker build` looks for a file named exactly `Dockerfile` in the build context directory and didn't find it. You're in the wrong directory, the file has a different name or extension, or the `-f` path is wrong."
tldr: "Run the build from the folder containing the Dockerfile: `docker build -t myapp .`. If it lives elsewhere or has another name, pass it explicitly: `docker build -f path/to/Dockerfile.dev -t myapp .`. Check the name with `ls -la` (no `.txt` extension, capital D)."
keywords: docker failed to read dockerfile open dockerfile no such file or directory failed to solve unable to prepare context unable to evaluate symlinks dockerfile path docker build -f compose build context dockerfile.txt
related: [docker-build-copy-failed-file-not-found, docker-failed-to-compute-cache-key-not-found, docker-failed-to-solve-did-not-complete-successfully]
---
## What it means

`docker build <context>` defaults to reading `<context>/Dockerfile`. BuildKit reports the missing file as `failed to read dockerfile: open Dockerfile`; the legacy builder says `unable to evaluate symlinks in Dockerfile path`. Either way, nothing is wrong with Docker — the file just isn't where Docker looked.

Check:

```bash
pwd
ls -la            # is there a file named exactly "Dockerfile"?
```

## Cause 1: running the build from the wrong directory

The `.` in `docker build .` is the current directory. If your Dockerfile is in `./backend`:

```bash
cd backend && docker build -t myapp .
# or from the repo root:
docker build -t myapp ./backend
```

When the Dockerfile is in a subfolder but needs files from the root, keep the root as context and point at the file:

```bash
docker build -f backend/Dockerfile -t myapp .
```

`-f` paths are relative to your current directory, not to the context.

## Cause 2: wrong file name

Docker is case-sensitive on Linux and expects `Dockerfile` with no extension. Common mistakes:

- `dockerfile` or `DockerFile` (works on Windows/macOS case-insensitive filesystems, fails on Linux CI)
- `Dockerfile.txt` — Windows Notepad adds `.txt` and Explorer hides it. Check with `dir` in a terminal or `ls -la`.
- `Dockerfile.dev`, `Dockerfile.prod` — fine, but need `-f`.

```bash
mv Dockerfile.txt Dockerfile
git mv dockerfile Dockerfile     # if tracked in git
```

## Cause 3: Docker Compose points at the wrong place

In Compose, `dockerfile:` is relative to `context:`:

```yaml
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev    # means ./api/Dockerfile.dev
```

A common bug is writing `dockerfile: ./api/Dockerfile` *and* `context: ./api`, which resolves to `./api/api/Dockerfile`.

## Cause 4: CI runs in a different directory

In CI, the job may run before checkout, or in a different working directory. Print it:

```yaml
- run: pwd && ls -la
- run: docker build -t myapp .
```

In GitHub Actions, `actions/checkout` must run before the build step, and `working-directory:` changes where `.` points.

## Reading the Dockerfile from stdin

You can bypass the file entirely:

```bash
docker build -t myapp -f- . < Dockerfile
```

That's handy in scripts, but if `COPY` then fails with `not found`, the problem is the context, not the Dockerfile.
