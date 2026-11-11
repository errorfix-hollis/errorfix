---
error: "Error response from daemon: error while removing network: network has active endpoints"
error_full: |
  Error response from daemon: error while removing network: network myapp_default id 3f2a9c1b7e44 has active endpoints
  failed to remove network myapp_default: Error response from daemon: error while removing network: network myapp_default has active endpoints
cat: docker
description: "Docker refuses to delete a network while containers are still attached to it. Usually a container from another Compose project, a manually started container, or a stale endpoint left after a daemon crash."
tldr: "See what's attached: `docker network inspect myapp_default --format '{{range .Containers}}{{.Name}} {{end}}'`. Stop or disconnect those containers (`docker network disconnect -f myapp_default <container>`), then `docker network rm myapp_default`. For Compose, `docker compose down --remove-orphans`. If nothing is listed, restart the daemon: `sudo systemctl restart docker`."
keywords: docker error while removing network has active endpoints docker compose down network rm disconnect remove-orphans stale endpoint
related: [docker-network-not-found, docker-container-name-already-in-use, docker-port-is-already-allocated]
---
## What it means

Each container connected to a network has an *endpoint* on it. `docker network rm` (and `docker compose down`, which removes the project's network at the end) fails if any endpoint still exists. The containers attached may be running *or stopped*.

Find out which ones:

```bash
docker network inspect myapp_default --format '{{range .Containers}}{{.Name}} {{end}}'
docker ps -a --filter network=myapp_default
```

## Cause 1: orphan containers from the same Compose project

If you renamed or removed a service in `docker-compose.yml`, its old container still belongs to the project and still uses the network. Compose warns `Found orphan containers` on `up`.

```bash
docker compose down --remove-orphans
```

## Cause 2: another project or manual container uses the network

A second Compose project that declares the network as `external`, or a container started with `docker run --network myapp_default`, keeps it busy. Stop the other stack first, or disconnect the container:

```bash
docker network disconnect myapp_default some_container
docker network rm myapp_default
```

If you want a network shared between projects, create it once yourself (`docker network create shared`) and mark it `external: true` in every Compose file, so no project tries to delete it on `down`:

```yaml
networks:
  shared:
    external: true
```

## Cause 3: stale endpoint, no container listed

After a crash or forced container removal, Docker's network database can keep an endpoint for a container that no longer exists. `inspect` then shows an entry with a name like `ep-...` or a container ID that `docker ps -a` doesn't know.

Force-disconnect it by name or ID:

```bash
docker network disconnect -f myapp_default <endpoint-name-or-container-id>
docker network rm myapp_default
```

If that fails, restart the daemon, which rebuilds the network state:

```bash
sudo systemctl restart docker
docker network rm myapp_default
```

On Docker Desktop, use "Restart" from the whale menu.

## Cause 4: Swarm overlay networks

For overlay networks, endpoints belong to services on any node. Remove the services first:

```bash
docker service ls
docker stack rm mystack        # wait until its tasks are gone
docker network rm my_overlay
```

## Cleaning up everything

To remove all networks not used by any container (keeps the default `bridge`, `host`, `none`):

```bash
docker network prune
```

This won't touch networks with active endpoints, so it's safe to run, but it also won't fix this error on its own; disconnect or remove the containers first.
