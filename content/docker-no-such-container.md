---
error: "Error response from daemon: No such container"
error_full: |
  Error response from daemon: No such container: myapp
  Error: No such container: 3f2a1bc9d8e7
cat: docker
description: "The Docker daemon has no container with that name or ID. It was removed, never created, has a different name (Compose adds prefixes), or you are talking to a different Docker daemon or context."
tldr: "Run `docker ps -a` to list all containers, including stopped ones, and use the exact name or ID shown. With Compose use `docker compose exec web sh` (service name) instead of the container name. Check `docker context ls` and that you aren't mixing `sudo docker` and `docker`."
keywords: docker error response from daemon no such container docker ps -a compose container name prefix --rm docker context sudo rootless exec logs stop rm
related: [docker-container-name-already-in-use, docker-cannot-connect-to-the-docker-daemon, docker-network-not-found]
---
## What it means

Commands like `docker exec`, `docker logs`, `docker stop`, `docker rm` and `docker inspect` look up a container by name or ID prefix. The daemon found no match. First see what actually exists:

```bash
docker ps -a --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}'
```

`docker ps` without `-a` only shows *running* containers.

## Cause 1: Compose generated a different name

Compose names containers `<project>-<service>-<index>` (Compose v2, e.g. `myapp-web-1`) or `<project>_<service>_1` (old v1). `docker exec web` fails; use the Compose command with the **service** name instead:

```bash
docker compose ps
docker compose exec web sh
docker compose logs -f web
```

Or set a fixed name in `compose.yaml`:

```yaml
services:
  web:
    image: nginx
    container_name: web
```

## Cause 2: the container was removed

- Started with `docker run --rm`: it is deleted as soon as it exits.
- `docker compose down` removes the project's containers.
- `docker system prune` / `docker container prune` delete stopped containers.
- Restarting Docker Desktop or resetting it can wipe everything.

If it's gone, recreate it (`docker run ...` or `docker compose up -d`). To see why it exited before removal, run it without `--rm` and check `docker logs <name>`.

## Cause 3: stale or wrong container ID

IDs change every time a container is recreated. Scripts that saved an ID earlier, or `docker compose up` after a config change, leave you with an old ID. Look containers up by name or label at runtime:

```bash
docker ps -q -f name=^myapp$
docker ps -q -f label=com.docker.compose.service=web
```

## Cause 4: different daemon, context or user

Containers created with `sudo docker` (root daemon) are invisible to rootless Docker, and Docker Desktop on Linux uses its own context separate from the system Docker Engine.

```bash
docker context ls          # the active one has a *
docker context use default
echo $DOCKER_HOST          # an env var overrides the context
```

Use the same user and context that created the container.

## Cause 5: errors during `docker compose up`

`No such container: <id>` during `up` usually means Compose's view is out of sync after a container was removed by hand. Clean up and recreate:

```bash
docker compose down --remove-orphans
docker compose up -d
```

If that doesn't help, `docker compose up -d --force-recreate`.
