---
error: "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?"
cat: docker
description: The Docker CLI can't reach the daemon. Start the Docker service (or Docker Desktop), and check you're using the right context.
tldr: "Linux: `sudo systemctl start docker` (and `sudo systemctl enable docker` to start at boot). macOS/Windows: start Docker Desktop and wait until it says it's running."
keywords: cannot connect to the docker daemon is the docker daemon running systemctl start docker desktop wsl context
related: [docker-permission-denied-docker-sock]
---
## What it means

The `docker` command is only a client. It needs the Docker daemon (`dockerd`) running and listening on the socket. Nothing is answering there.

## Linux

```bash
sudo systemctl status docker
sudo systemctl start docker
sudo systemctl enable docker     # start on boot
```

If it fails to start, read the reason:

```bash
sudo journalctl -u docker --no-pager -n 50
```

Common reasons: a syntax error in `/etc/docker/daemon.json`, a full disk, or a conflicting storage driver.

No systemd (some WSL setups, minimal containers)? Use `sudo service docker start`.

## macOS and Windows

The daemon runs inside Docker Desktop. Open Docker Desktop and wait until the whale icon says **running**. If it's stuck, use *Troubleshoot → Restart* or *Reset to factory defaults*.

## WSL 2

Either enable *Settings → Resources → WSL integration* for your distro in Docker Desktop, or install Docker Engine inside the distro and start it with `sudo service docker start`.

## Wrong context or DOCKER_HOST

The CLI may be pointing to a socket that doesn't exist:

```bash
docker context ls
docker context use default
echo $DOCKER_HOST     # unset it if it points somewhere wrong: unset DOCKER_HOST
```

Colima, Podman, OrbStack and Rancher Desktop each create their own context or socket, so make sure the one you're using is started (`colima start`, `podman machine start`).

## It works with sudo but not without

That's a permissions problem, not a daemon problem. See [permission denied while trying to connect to the Docker daemon socket](/docker/docker-permission-denied-docker-sock/).
