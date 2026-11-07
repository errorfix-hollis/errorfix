---
error: "Error response from daemon: network not found"
error_full: |
  Error response from daemon: network 3f2a9c1d7b8e... not found
  Error response from daemon: failed to set up container networking: network myapp_default not found
  network mynet declared as external, but could not be found
cat: docker
description: "A container or Compose project refers to a Docker network that no longer exists, usually because it was removed (`docker network prune`, `compose down`) or recreated with a new ID while the container still points to the old one."
tldr: "For a stopped container stuck on an old network ID, recreate it: `docker compose up -d --force-recreate` (or `docker rm` + `docker run`). For `declared as external, but could not be found`, create it first: `docker network create mynet`. List networks with `docker network ls`."
keywords: docker error response from daemon network not found compose external network could not be found docker network create network prune force-recreate container network id stale
related: [docker-container-name-already-in-use, docker-port-is-already-allocated, docker-cannot-connect-to-the-docker-daemon]
---
## What it means

Containers store the **ID** of each network they are attached to, not just its name. If that network is deleted and maybe recreated under the same name, the new one has a different ID, and starting the old container fails with `network <id> not found`. Compose has its own variant when a network marked `external: true` doesn't exist.

See what exists and what the container expects:

```bash
docker network ls
docker inspect -f '{{json .NetworkSettings.Networks}}' mycontainer
```

## Cause 1: the network was pruned or removed

`docker network prune`, `docker system prune`, or `docker compose down` in another terminal removed it while a container still referenced it. Typical when you `docker start` an old container.

Fix with Compose: recreate the containers so they attach to the current networks:

```bash
docker compose down
docker compose up -d --force-recreate
```

Fix for a plain container: remove and run it again (data in named volumes is kept):

```bash
docker rm mycontainer
docker run -d --name mycontainer --network mynet myimage
```

Or reattach without recreating:

```bash
docker network create mynet                 # if it doesn't exist
docker network disconnect -f mynet mycontainer 2>/dev/null
docker network connect mynet mycontainer
docker start mycontainer
```

## Cause 2: Compose external network doesn't exist

```yaml
networks:
  shared:
    external: true
    name: mynet
```

Compose won't create external networks; it expects you to:

```bash
docker network create mynet
docker compose up -d
```

If several projects share a network, create it once (e.g. in a setup script) and mark it external everywhere. Alternatively, drop `external: true` so Compose creates `<project>_shared` itself.

## Cause 3: project name changed

Compose names networks `<project>_default`. The project name defaults to the folder name, so renaming or moving the folder, or using `-p`, makes Compose look for a different network while old containers still reference the old one. Use a stable name:

```yaml
name: myapp          # top-level in compose.yaml
```

or `COMPOSE_PROJECT_NAME=myapp` in `.env`, then `docker compose up -d --force-recreate`. Clean up leftovers from the old project with `docker compose -p oldname down`.

## Cause 4: Docker Swarm overlay networks

`docker run --network myoverlay` fails with `network myoverlay not found` if the overlay wasn't created with `--attachable`, or the node isn't a Swarm manager/worker:

```bash
docker network create -d overlay --attachable myoverlay
```

For `docker stack deploy`, external networks must be overlays created on a manager.

## Cause 5: daemon restarted with a corrupted network database

Rarely, after a crash or upgrade, the daemon's network state (`/var/lib/docker/network/files/local-kv.db`) no longer matches containers. Restarting Docker usually fixes it:

```bash
sudo systemctl restart docker
```

As a last resort, stop Docker, move `local-kv.db` away and start Docker again; it is rebuilt, but user-defined networks must be recreated and containers reattached.

## Prevent it

Avoid `docker system prune` while stopped containers you care about exist (it removes networks not used by *running* containers). Prefer `docker compose up` over `docker start` for Compose-managed containers, because Compose checks and recreates networks.
