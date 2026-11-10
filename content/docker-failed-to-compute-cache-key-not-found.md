---
error: "failed to compute cache key: failed to calculate checksum of ref: not found"
error_full: |
  ERROR: failed to solve: failed to compute cache key: failed to calculate checksum of ref 4c1a2b3c-...::xyz: "/app/package.json": not found
cat: docker
description: "BuildKit could not find a file named in a COPY or ADD instruction inside the build context. The path is wrong, outside the context, or excluded by .dockerignore."
tldr: "Paths in `COPY` are relative to the build context (the `.` in `docker build .`), not the Dockerfile. Check the file exists there, isn't excluded by `.dockerignore`, and the case matches. In Compose, set `build.context` to the folder that contains the files. For `COPY --from=stage`, check the path exists in that stage."
keywords: docker failed to compute cache key failed to calculate checksum of ref not found copy add build context dockerignore buildkit compose context copy --from
related: [docker-build-copy-failed-file-not-found, docker-failed-to-solve-did-not-complete-successfully, docker-exec-format-error]
---
## What it means

With BuildKit (the default builder since Docker 23), each `COPY`/`ADD` source is checksummed for the layer cache. If the source path doesn't exist in what BuildKit received as the **build context**, checksum calculation fails with `not found`. The legacy builder reported the same problem as [COPY failed: file not found](/docker/docker-build-copy-failed-file-not-found/).

The path in quotes (e.g. `"/app/package.json"`) is the path as BuildKit looked it up inside the context.

## Cause 1: path is relative to the Dockerfile instead of the context

```bash
docker build -f docker/Dockerfile .
```

Here the context is the repository root (`.`), so `COPY package.json .` looks for `./package.json`, **not** `docker/package.json`. Either fix the path in `COPY`, or pass a different context:

```bash
docker build -f docker/Dockerfile docker/
```

You can't copy files from outside the context: `COPY ../shared ./shared` fails. Move the context up a level and adjust paths, or use a named extra context:

```bash
docker buildx build --build-context shared=../shared .
```

```dockerfile
COPY --from=shared . ./shared
```

## Cause 2: excluded by .dockerignore

Files listed in `.dockerignore` are never sent to the builder. Common culprits: `*`, `build`, `dist`, `*.json`, or an allow-list pattern that forgets a file.

```
# .dockerignore allow-list style
*
!package.json
!package-lock.json
!src
```

To see exactly what's in the context:

```dockerfile
# throwaway debug Dockerfile
FROM busybox
COPY . /ctx
RUN find /ctx -maxdepth 2
```

```bash
docker build --no-cache --progress=plain -f Dockerfile.debug .
```

## Cause 3: Docker Compose context

```yaml
services:
  web:
    build:
      context: ./frontend       # COPY paths are relative to this
      dockerfile: Dockerfile    # relative to context
```

If `context` is `.` but the files live in `./frontend`, every `COPY` fails. Note that `dockerfile` is resolved relative to `context`.

## Cause 4: `COPY --from` a stage that doesn't have the file

```dockerfile
FROM node:22 AS build
WORKDIR /app
RUN npm run build          # outputs /app/dist
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html   # wrong: it's /app/dist
```

Check the real output path (Vite: `dist`, Create React App: `build`, Next.js standalone: `.next/standalone`) and the stage's `WORKDIR`. Absolute paths are safer here.

## Cause 5: case sensitivity and generated files

Linux builders are case-sensitive: `COPY Requirements.txt .` fails if the file is `requirements.txt`, even if it works on macOS/Windows. And files that are generated locally (e.g. `dist/`, `.env`) won't exist in CI checkouts unless they're committed or built inside the image.

## Cause 6: wrong context in CI

In GitHub Actions `docker/build-push-action`, the default context is the Git checkout of the repo; set `context: ./subdir` if needed. Make sure `actions/checkout` ran first and Git LFS files are pulled if you copy them.
