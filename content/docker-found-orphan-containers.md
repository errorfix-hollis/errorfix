---
error: "Found orphan containers for this project. If you removed or renamed this service in your compose file, you can run this command with the --remove-orphans flag to clean it up."
error_full: |
  WARN[0000] Found orphan containers ([myapp-redis-1 myapp-worker-1]) for this project. If you removed or renamed this service in your compose file, you can run this command with the --remove-orphans flag to clean it up.
cat: docker
description: "Docker Compose found running or stopped containers labelled with your project name that don't match any service in the current compose file: a service was removed/renamed, or two compose files share the same project name."
tldr: "If the services were removed or renamed, clean up with `docker compose up -d --remove-orphans` (or `docker compose down --remove-orphans`). If two different stacks share a folder name, give each a unique project name: `docker compose -p myproject up -d` or `name: myproject` at the top of compose.yaml."
keywords: docker compose found orphan containers for this project remove-orphans flag project name com.docker.compose.project COMPOSE_PROJECT_NAME renamed service warning
related: [docker-container-name-already-in-use, docker-network-has-active-endpoints, docker-compose-command-not-found]
---
## What it means

Compose doesn't keep a state file. It finds "its" containers by **labels**: every container it creates gets `com.docker.compose.project=<project>` and `com.docker.compose.service=<service>`. On `up`, `run` or `down`, it lists containers with your project label and compares them to the services in the compose file. Containers whose service no longer exists are **orphans**.

It's a warning, not a failure. But orphans keep running, hold ports and networks, and can cause [network has active endpoints](/docker/docker-network-has-active-endpoints/) on `down`.

See what Compose considers part of the project:

```bash
docker ps -a --filter "label=com.docker.compose.project=myapp" \
  --format "table {{.Names}}\t{{.Label \"com.docker.compose.service\"}}\t{{.Status}}"
```

## Cause 1: you removed or renamed a service

You renamed `redis` to `cache`, or deleted the `worker` service. The old containers are still there. Remove them:

```bash
docker compose up -d --remove-orphans
# or tear everything down, orphans included
docker compose down --remove-orphans
```

To make this the default (Compose v2.x), set:

```bash
export COMPOSE_REMOVE_ORPHANS=1
```

## Cause 2: two compose projects share the same name

The project name defaults to the **directory name**. Two separate stacks in folders both called `docker` or `app` (e.g. `~/work/api/docker` and `~/work/web/docker`) become the same project and see each other's containers as orphans. Running `--remove-orphans` here would delete the other stack, so don't.

Give each stack a unique name instead. In `compose.yaml` (Compose v2.3+):

```yaml
name: api
services:
  db:
    image: postgres:16
```

Or on the command line / environment:

```bash
docker compose -p api up -d
# .env next to the compose file
COMPOSE_PROJECT_NAME=api
```

After renaming, the old containers still carry the old label; stop them once with the old name: `docker compose -p docker down`.

## Cause 3: several compose files for one project

If you run `docker compose -f compose.yaml -f compose.dev.yaml up` sometimes and only `compose.yaml` other times, services defined only in the dev file look like orphans in the second case. Always pass the same set of files, or put them in `COMPOSE_FILE`:

```bash
# .env
COMPOSE_FILE=compose.yaml:compose.dev.yaml
```

Services you only want sometimes are better handled with **profiles**:

```yaml
services:
  adminer:
    image: adminer
    profiles: [debug]
```

```bash
docker compose --profile debug up -d
```

## Cause 4: `docker compose run` containers

One-off containers from `docker compose run` (named like `myapp-web-run-1a2b3c`) stay around unless you use `--rm`:

```bash
docker compose run --rm web python manage.py migrate
```

Clean up leftovers with `docker compose down --remove-orphans` or `docker container prune`.
