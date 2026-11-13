---
error: "service \"app\" refers to undefined volume data: invalid compose project"
error_full: |
  service "app" refers to undefined volume data: invalid compose project
  service "web" refers to undefined network backend: invalid compose project
cat: docker
description: "A service uses a named volume or network that isn't declared in the top-level volumes: or networks: section of the Compose file, often because of indentation or a missing ./ on a bind-mount path."
tldr: "Declare it in a top-level `volumes:` (or `networks:`) section at zero indentation, e.g. `volumes:` followed by `  data:`. If you meant a host folder, write it as a path: `./data:/var/lib/data` — a bare name like `data:/path` is a named volume. Validate with `docker compose config`."
keywords: docker compose service refers to undefined volume network invalid compose project named volume bind mount top-level volumes networks external indentation docker compose config
related: [docker-network-not-found, docker-found-orphan-containers, docker-compose-command-not-found]
---
## What it means

In Compose, a volume entry `NAME:/container/path` where `NAME` has no `/` or `.` prefix is a **named volume**. Named volumes and custom networks must be declared at the top level of the file. Compose v2 validates this before starting anything and stops with `invalid compose project`.

## Cause 1: the top-level declaration is missing

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
# pgdata is never declared -> error
```

Fix:

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Same for networks:

```yaml
services:
  web:
    networks: [backend]

networks:
  backend:
```

## Cause 2: you meant a host directory (bind mount)

```yaml
volumes:
  - data:/app/data        # named volume "data"
  - ./data:/app/data      # host folder ./data
  - /srv/data:/app/data   # absolute host path
```

A host path must start with `.`, `/` or `~`. On Windows, use `./data` or `C:/path/data`.

## Cause 3: indentation puts it in the wrong place

YAML indentation decides where a key belongs. Here `volumes:` is nested inside the `db` service, so it's a service-level setting, not a declaration:

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
  volumes:          # wrong: indented under services, looks like a service named "volumes"
    pgdata:
```

Top-level `volumes:` and `networks:` must start at column 0, same as `services:`. Use spaces, not tabs. A [YAML validator](/tools/yaml-validator/) shows the structure.

## Cause 4: multiple compose files or profiles

With `-f docker-compose.yml -f docker-compose.override.yml`, the volume may be used in one file but declared only in a file you didn't pass. Check the merged result:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

`docker compose config` prints the fully resolved file, or the exact validation error.

## Cause 5: using an existing volume/network created outside Compose

If the volume or network already exists (created by `docker volume create` or another project), declare it as external so Compose doesn't create or rename it:

```yaml
volumes:
  pgdata:
    external: true
    name: my_existing_volume

networks:
  shared:
    external: true
    name: proxy_network
```

If it doesn't exist yet: `docker network create proxy_network`. Otherwise you'll get [network not found](/docker/docker-network-not-found/).

## Cause 6: variable substitution produced an unexpected name

```yaml
volumes:
  - ${DATA_DIR}:/data
```

If `DATA_DIR` is unset, it becomes `:/data` (error), and if it's `data` without `./`, it becomes a named volume. Set it in `.env` as `DATA_DIR=./data`, or use a default: `${DATA_DIR:-./data}:/data`.

## Verify

```bash
docker compose config --volumes
docker compose up -d
docker volume ls
```
