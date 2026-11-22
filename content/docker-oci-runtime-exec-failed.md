---
error: "OCI runtime exec failed: exec failed: unable to start container process: exec: \"bash\": executable file not found in $PATH"
error_full: |
  OCI runtime exec failed: exec failed: unable to start container process: exec: "bash": executable file not found in $PATH: unknown
  OCI runtime exec failed: exec failed: unable to start container process: chdir to cwd ("/app") set in config.json failed: no such file or directory: unknown
cat: docker
description: "`docker exec` (or `kubectl exec`) asked the container to run a program that doesn't exist inside the image, most often bash in an Alpine, distroless or scratch image."
tldr: "Use a shell that exists: `docker exec -it CONTAINER sh` (Alpine/BusyBox have sh, not bash). For distroless/scratch images there is no shell: use `docker debug CONTAINER`, `kubectl debug -it POD --image=busybox --target=CONTAINER`, or `docker cp` to inspect files."
keywords: docker oci runtime exec failed exec failed unable to start container process executable file not found in path bash sh alpine distroless scratch kubectl exec docker exec -it chdir to cwd
related: [docker-oci-runtime-create-failed-executable-file-not-found, docker-no-such-container, docker-the-input-device-is-not-a-tty]
---
## What it means

The container is running, but the command you passed to `docker exec` couldn't be started inside it. The quoted name (`"bash"`) is what was looked up in the container's `$PATH`, not on your host.

If you see this when *starting* a container (`docker run`, `OCI runtime create failed`), the image's `CMD`/`ENTRYPOINT` is wrong instead; see the related page.

## Cause 1: the image has no bash

Alpine and BusyBox-based images (`node:20-alpine`, `nginx:alpine`, `redis:alpine`, ...) ship `/bin/sh` only:

```bash
docker exec -it mycontainer sh
kubectl exec -it mypod -- sh
```

If you need bash in your own Alpine image: `RUN apk add --no-cache bash`.

Check what's available:

```bash
docker exec mycontainer ls /bin /usr/bin
```

## Cause 2: distroless or scratch image (no shell at all)

`gcr.io/distroless/*`, Go/Rust binaries `FROM scratch`, and many hardened images contain only the app. `sh` fails too. Options:

```bash
# Docker Desktop / Docker 4.33+: attach a toolbox to the container
docker debug mycontainer

# Kubernetes: ephemeral debug container sharing the process namespace
kubectl debug -it mypod --image=busybox:1.36 --target=app

# copy files out to inspect them
docker cp mycontainer:/app/config.yaml .
```

Distroless images also have `:debug` tags with a BusyBox shell at `/busybox/sh`, useful during development.

## Cause 3: typo or wrong argument order

Everything after the container name is the command:

```bash
docker exec -it mycontainer bash -c "ls /app"   # right
docker exec mycontainer -it bash                 # wrong: tries to run "-it"
```

With `kubectl`, the command must come after `--`:

```bash
kubectl exec -it mypod -c app -- /bin/sh
```

On Git Bash for Windows, `/bin/sh` may be rewritten to a Windows path; use `//bin/sh` or prefix the command with `MSYS_NO_PATHCONV=1`.

## Cause 4: tool not installed (curl, ps, ping, vim)

`exec: "curl": executable file not found` means exactly that: slim images leave out debugging tools. Install temporarily (lost when the container is recreated):

```bash
docker exec -u 0 -it mycontainer sh -c "apk add curl"           # Alpine
docker exec -u 0 -it mycontainer sh -c "apt-get update && apt-get install -y curl"  # Debian
```

Or run the tool from another container in the same network namespace:

```bash
docker run --rm -it --network container:mycontainer nicolaka/netshoot curl localhost:8080
```

## Cause 5: chdir to cwd failed

`chdir to cwd ("/app") set in config.json failed` means the image's `WORKDIR` doesn't exist in the running container (for example a volume mounted over it was removed). Override the directory:

```bash
docker exec -it -w / mycontainer sh
```

## Cause 6: the container is restarting

If the container is in a restart loop, exec can fail in odd ways. Check `docker ps -a` and `docker logs mycontainer` first.
