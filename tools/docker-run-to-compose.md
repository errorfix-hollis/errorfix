---
name: "docker run to Compose converter"
title: "docker run to docker-compose Converter — convert commands to compose.yaml"
h1: "Convert docker run to docker compose"
description: "Paste docker run commands and get a compose.yaml: ports, volumes, bind mounts, environment, env files, networks, restart policy, healthchecks, GPUs, ulimits and more, with warnings for flags that behave differently in Compose."
intro: "Convert one or more docker run commands into a docker compose file. Handles -p, -v, --mount, -e, --env-file, --name, --restart, --network, -w, -u, --entrypoint, healthchecks, --gpus and the image's command, and explains what has no Compose equivalent."
order: 20
js: dockerrun
keywords: "docker run to docker compose convert docker run to compose docker run to docker-compose.yml composerize compose.yaml generator docker compose ports volumes environment"
related: [docker-port-is-already-allocated, docker-compose-additional-property-is-not-allowed, docker-compose-service-refers-to-undefined-volume, docker-compose-version-is-obsolete]
---
## How flags map to Compose keys

| docker run | compose.yaml |
|---|---|
| `--name web` | `container_name: web`, and the service is named `web` |
| `-p 8080:80` | `ports: ["8080:80"]` |
| `-v ./data:/data`, `-v pgdata:/data` | `volumes:`; named volumes are also declared at the top level |
| `--mount type=bind,…` | long-syntax volume (`type`, `source`, `target`, `read_only`) |
| `-e KEY=value`, `--env-file .env` | `environment:`, `env_file:` |
| `--network mynet` | `networks: [mynet]` + top-level `external: true` |
| `--network host` | `network_mode: "host"` |
| `--restart unless-stopped` | `restart: unless-stopped` |
| `-w`, `-u`, `--entrypoint` | `working_dir`, `user`, `entrypoint` |
| arguments after the image | `command: [...]` |
| `-it` | `stdin_open: true`, `tty: true` |

## Gotchas the converter handles

- **Always quote ports.** YAML 1.1 reads `22:22` as a base-60 number (1342), so the converter always writes ports as strings.
- **`$` must be doubled.** Compose substitutes `${VAR}` and `$VAR` from your shell and `.env`, so a password like `pa$word` must be written `pa$$word`. The converter does this for you.
- **`restart: "no"`** needs quotes, because a bare `no` is a boolean in YAML.
- **`$(pwd)` becomes `.`**. Relative paths in compose.yaml are relative to the file itself.
- **`--rm` and `-d` are not file settings.** Use `docker compose up -d`, and `docker compose run --rm service` for one-off tasks.
- **Named volumes get a project prefix.** `pgdata` becomes `myproject_pgdata`, so add `external: true` to reuse data created by `docker run`.

You don't need a top-level `version:` key any more (see [the attribute `version` is obsolete](/docker/docker-compose-version-is-obsolete/)). If `docker compose up` then fails with [port is already allocated](/docker/docker-port-is-already-allocated/), the old `docker run` container is probably still running: `docker rm -f <name>` first.
