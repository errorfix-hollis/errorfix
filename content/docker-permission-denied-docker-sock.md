---
error: "permission denied while trying to connect to the Docker daemon socket"
error_full: |
  permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Get "http://%2Fvar%2Frun%2Fdocker.sock/v1.24/containers/json": dial unix /var/run/docker.sock: connect: permission denied
cat: docker
description: Your user isn't allowed to talk to the Docker daemon. Add yourself to the docker group and start a new login session.
tldr: "Run `sudo usermod -aG docker $USER`, then log out and back in (or run `newgrp docker`). Check with `docker run hello-world`."
keywords: docker permission denied docker.sock daemon socket usermod docker group linux without sudo
related: [docker-cannot-connect-to-the-docker-daemon]
---
## What it means

The Docker CLI talks to the daemon through the socket `/var/run/docker.sock`, which is owned by `root` and the `docker` group. Your user is in neither.

## Fix: add your user to the docker group

```bash
sudo groupadd docker          # usually exists already
sudo usermod -aG docker "$USER"
```

Group changes only apply to **new** login sessions. Either log out and back in, reboot, or start a shell with the new group:

```bash
newgrp docker
docker run hello-world
```

Check that it worked: `groups` should list `docker`.

**Security note:** members of the `docker` group effectively have root access to the machine (they can mount `/` into a container). Only add trusted users. For stricter setups, look at [rootless Docker](https://docs.docker.com/engine/security/rootless/).

## Still denied after re-login?

- **The socket has odd permissions** (for example after a manual daemon start):

```bash
ls -l /var/run/docker.sock
sudo chown root:docker /var/run/docker.sock
```

Don't `chmod 666` the socket: it gives every user on the machine root-level access.

- **Snap Docker on Ubuntu** uses its own setup. If you installed via snap, either follow the snap's instructions or remove it (`sudo snap remove docker`) and install Docker from the official apt repository.
- **In a CI runner or a VS Code dev container**, the user inside may not match the socket's group ID. Add the user to a group with the socket's GID: `stat -c %g /var/run/docker.sock`.
- **Docker Desktop on Linux** uses a different socket (`~/.docker/desktop/docker.sock`). Check `docker context ls` and select the right context.
