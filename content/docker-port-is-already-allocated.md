---
error: "Bind for 0.0.0.0:8080 failed: port is already allocated"
error_full: |
  docker: Error response from daemon: driver failed programming external connectivity on endpoint web: Bind for 0.0.0.0:8080 failed: port is already allocated.
cat: docker
description: Another container or process already uses that host port. Stop it, or publish your container on a different port.
tldr: "Find what uses the port with `docker ps --filter publish=8080` (or `sudo lsof -i :8080`), stop it, or run your container on another host port: `-p 8081:8080`."
keywords: port is already allocated bind failed docker run compose address already in use 0.0.0.0
related: [linux-address-already-in-use]
---
## What it means

`-p 8080:80` asks Docker to listen on **host** port 8080. Something already listens there, so Docker can't.

## Find what's using the port

Another container (including stopped-but-restarting ones):

```bash
docker ps -a --filter "publish=8080"
```

Any process on the host:

```bash
sudo lsof -i :8080
# or
sudo ss -ltnp | grep :8080
```

## Fix 1: stop the other container

```bash
docker stop <container>
docker rm <container>      # if you don't need it
```

With Compose, an old project might still be running: `docker compose ls`, then `docker compose -p <name> down`.

## Fix 2: use a different host port

The left number is the host port, the right one the container port:

```bash
docker run -p 8081:80 nginx
```

In `compose.yaml`:

```yaml
ports:
  - "8081:80"
```

## Fix 3: port held by a ghost

If nothing shows up but the error stays, the Docker proxy may be stuck. Restart Docker:

```bash
sudo systemctl restart docker
```

On Windows, ports can be reserved by Hyper-V/WinNAT. Check with `netsh interface ipv4 show excludedportrange protocol=tcp` and pick a port outside those ranges.
