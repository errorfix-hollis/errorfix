---
error: "Conflict. The container name is already in use by container"
error_full: |
  docker: Error response from daemon: Conflict. The container name "/web" is already in use by container "3f5c1e…". You have to remove (or rename) that container to be able to reuse that name.
cat: docker
description: A container with that name already exists (often stopped). Remove it, start it instead, or run with --rm next time.
tldr: "Remove the old one: `docker rm -f web`, then run again. Or reuse it: `docker start web`. Add `--rm` to `docker run` so containers delete themselves when they stop."
keywords: docker conflict container name already in use remove or rename docker run --name rm -f stopped container
related: [docker-port-is-already-allocated]
---
## What it means

`docker run --name web ...` creates a **new** container. Container names are unique, and a container named `web` already exists, even if it's stopped.

```bash
docker ps -a --filter name=web
```

## Fix 1: remove the old container

```bash
docker rm web        # if it's stopped
docker rm -f web     # stop and remove
```

Volumes survive this; anonymous data inside the container's filesystem does not.

## Fix 2: start the existing container

If you want the same container (with its existing state) back:

```bash
docker start -a web
```

## Fix 3: avoid it in the future

```bash
docker run --rm --name web nginx       # removed automatically when it stops
```

In scripts, remove before running:

```bash
docker rm -f web 2>/dev/null || true
docker run -d --name web nginx
```

Or use Docker Compose, which recreates containers for you with `docker compose up -d`.
