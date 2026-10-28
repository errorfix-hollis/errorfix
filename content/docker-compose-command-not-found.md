---
error: "docker-compose: command not found"
error_full: |
  docker-compose: command not found
  docker: 'compose' is not a docker command.
cat: docker
description: Compose v1 (the separate docker-compose binary) is deprecated and often not installed. Modern Docker ships Compose v2 as a plugin, run as "docker compose" with a space. If that also fails, install the compose plugin.
tldr: "Use `docker compose up` (space, not dash). If you get `'compose' is not a docker command`, install the plugin: `sudo apt-get install docker-compose-plugin` (from Docker's apt repo) or update Docker Desktop."
keywords: docker-compose command not found docker compose is not a docker command compose v2 plugin install ubuntu docker-compose-plugin
related: [docker-cannot-connect-to-the-docker-daemon, docker-permission-denied-docker-sock]
---
## What it means

There are two generations of Compose:

| | Compose v1 | Compose v2 |
|---|---|---|
| Command | `docker-compose` | `docker compose` |
| Written in | Python | Go (Docker CLI plugin) |
| Status | End of life since 2023 | Current |

Most tutorials still say `docker-compose`, but new installs only include v2.

## Fix 1: use the v2 command

```bash
docker compose version
docker compose up -d
docker compose down
```

The flags and `docker-compose.yml` / `compose.yaml` files are the same.

## Fix 2: install the Compose plugin (Linux)

If `docker compose` says `'compose' is not a docker command`:

Ubuntu/Debian with Docker's official repository:

```bash
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

Fedora/RHEL: `sudo dnf install docker-compose-plugin`.

If you installed Docker from your distro's own packages (`docker.io` on Ubuntu), the plugin may be called `docker-compose-v2`:

```bash
sudo apt-get install docker-compose-v2
```

Manual install for the current user:

```bash
mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
```

## Fix 3: Docker Desktop (Mac/Windows)

Compose v2 is bundled. Update Docker Desktop, and make sure the Docker CLI is on your PATH (restart the terminal after installing).

## Scripts that still call `docker-compose`

Add a small wrapper instead of editing every script:

```bash
sudo tee /usr/local/bin/docker-compose >/dev/null <<'SH'
#!/bin/sh
exec docker compose "$@"
SH
sudo chmod +x /usr/local/bin/docker-compose
```
