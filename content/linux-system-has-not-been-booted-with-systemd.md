---
error: "System has not been booted with systemd as init system (PID 1). Can't operate."
error_full: |
  System has not been booted with systemd as init system (PID 1). Can't operate.
  Failed to connect to bus: Host is down
cat: linux
description: "You ran `systemctl` in an environment where PID 1 is not systemd: a Docker container, WSL without systemd enabled, or a chroot. systemctl has no systemd to talk to."
tldr: "On WSL2, enable systemd: add `[boot]` / `systemd=true` to `/etc/wsl.conf`, then run `wsl --shutdown` in PowerShell and reopen. In Docker, don't use systemctl; start the program directly as the container's CMD (e.g. `nginx -g 'daemon off;'`). Quick workaround: `sudo service nginx start`."
keywords: system has not been booted with systemd as init system pid 1 can't operate failed to connect to bus host is down wsl wsl2 wsl.conf systemd=true docker container systemctl service
related: [linux-unit-service-not-found, linux-job-for-service-failed-because-the-control-process-exited-with-error-code, docker-oci-runtime-exec-failed]
---
## What it means

`systemctl` is a client: it sends requests over D-Bus to the systemd process running as PID 1. When PID 1 is something else (`init` from WSL, `bash` or your app in a container, nothing in a chroot), there's nothing to answer. Check what PID 1 is:

```bash
ps -p 1 -o comm=
```

If it isn't `systemd`, systemctl won't work.

## Fix 1: WSL2 - enable systemd

WSL2 supports systemd since WSL 0.67.6 (late 2022). Update WSL first from PowerShell:

```powershell
wsl --update
wsl --version
```

Then inside your distro:

```bash
sudo tee /etc/wsl.conf >/dev/null <<'CONF'
[boot]
systemd=true
CONF
```

If `/etc/wsl.conf` already has content, add the `[boot]` section instead of overwriting the file. Restart WSL from PowerShell:

```powershell
wsl --shutdown
```

Open the distro again and check: `ps -p 1 -o comm=` should print `systemd`, and `systemctl status` works. WSL1 cannot run systemd; convert with `wsl --set-version <distro> 2`.

## Fix 2: use the `service` command

Many packages still ship SysV init scripts in `/etc/init.d/`. The `service` wrapper calls them directly when systemd isn't running:

```bash
sudo service ssh start
sudo service postgresql status
sudo /etc/init.d/nginx restart
```

This works on WSL without systemd and in many containers. It doesn't work for services that only ship a systemd unit; then see the error [Unit not found](/linux/linux-unit-service-not-found/) or run the program directly.

## Fix 3: Docker containers - run the process directly

Containers are designed to run one main process as PID 1, not an init system. Replace `systemctl start` in Dockerfiles and scripts with the program in the foreground:

```dockerfile
FROM nginx:1.27
# not: RUN systemctl enable nginx
CMD ["nginx", "-g", "daemon off;"]
```

Examples of foreground commands: `redis-server`, `postgres -D /var/lib/postgresql/data`, `/usr/sbin/sshd -D`, `php-fpm -F`. Need several processes? Use separate containers in Docker Compose, or a light supervisor like `supervisord` or `tini`.

Installing packages whose post-install scripts call `systemctl` can print this error during `apt-get install` in a Dockerfile; it is usually harmless, and the package is installed anyway.

## Fix 4: you really need systemd in a container

For testing systemd units (Ansible roles, packaging), use an image built for it and run it with the right options, e.g. with Podman, which supports systemd natively:

```bash
podman run -d --name sd registry.access.redhat.com/ubi9/ubi-init
```

With Docker this needs `--privileged` or cgroup mounts and an image whose CMD is `/sbin/init`; avoid it for production.

## Fix 5: chroot or rescue environment

Inside `chroot` (e.g. repairing a system from a live USB) systemd isn't PID 1 of that root either. `systemctl enable/disable` still works there because it only creates symlinks, but `start`/`restart`/`status` don't. Reboot into the real system to start services.
