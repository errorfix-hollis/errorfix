---
error: "Failed to connect to bus: No such file or directory"
error_full: |
  $ systemctl --user status
  Failed to connect to bus: No such file or directory
cat: linux
description: "systemctl, timedatectl, hostnamectl or loginctl can't reach the D-Bus socket. Usually systemd isn't running as PID 1 (Docker, WSL, chroot), or there's no user session bus because you used su/sudo or SSH without a login session."
tldr: "Check `ps -p 1 -o comm=`. If it isn't `systemd` (containers, old WSL), use `service name start` or run the program directly; on WSL add `[boot] systemd=true` to /etc/wsl.conf then `wsl --shutdown`. For `systemctl --user` errors, log in as that user directly (`machinectl shell user@` or SSH) instead of `su`, or run `sudo loginctl enable-linger user` and set `XDG_RUNTIME_DIR=/run/user/$(id -u)`."
keywords: linux failed to connect to bus no such file or directory systemctl --user dbus wsl docker container XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS loginctl enable-linger su sudo timedatectl hostnamectl
related: [linux-system-has-not-been-booted-with-systemd, linux-unit-service-not-found]
---
## What it means

systemd tools don't do the work themselves; they send requests over D-Bus:

- `systemctl`, `timedatectl`, `hostnamectl` → the **system bus** at `/run/dbus/system_bus_socket` or systemd's private socket.
- `systemctl --user`, `journalctl --user` → the **user bus** at `/run/user/<UID>/bus`.

"No such file or directory" means that socket file doesn't exist.

First, find out which case you're in:

```bash
ps -p 1 -o comm=                 # is PID 1 systemd?
echo $XDG_RUNTIME_DIR            # should be /run/user/<uid> for --user
ls -l /run/user/$(id -u)/bus
```

## Cause 1: not running under systemd (Docker, chroot, old WSL)

Inside a container or chroot, PID 1 is your app or a shell, so there is no systemd and no bus. You'll often also see `System has not been booted with systemd as init system`.

- Start services the classic way: `service nginx start` or run the binary directly (`nginx -g 'daemon off;'`).
- In Docker, the container's main process should be the service itself (`CMD ["nginx", "-g", "daemon off;"]`), not systemd.

**WSL 2**: enable systemd in the distro:

```bash
sudo tee /etc/wsl.conf <<'CONF'
[boot]
systemd=true
CONF
```

Then in PowerShell: `wsl --shutdown`, and reopen the distro. Requires a recent WSL (`wsl --update`).

## Cause 2: `systemctl --user` after `su` or `sudo -u`

`su otheruser` doesn't create a login session, so `/run/user/<uid>` and the user's systemd instance may not exist, and `XDG_RUNTIME_DIR` still points to the old user.

Options:

```bash
# proper login session for the user
sudo machinectl shell otheruser@
# or SSH in as that user
ssh otheruser@localhost
```

If the user's manager is running but env vars are missing:

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=$XDG_RUNTIME_DIR/bus
systemctl --user status
```

## Cause 3: user services for an account that isn't logged in

The user manager only runs while the user has a session. For service accounts and headless servers enable lingering so it starts at boot:

```bash
sudo loginctl enable-linger otheruser
```

This is also the fix for rootless Podman/Docker and user services in cron jobs (set `XDG_RUNTIME_DIR` in the cron line).

## Cause 4: dbus not installed or not running

Minimal images may lack D-Bus entirely:

```bash
sudo apt install dbus        # Debian/Ubuntu
sudo systemctl start dbus
```

For user sessions on minimal desktops you may need `dbus-user-session` (`sudo apt install dbus-user-session`, then log out and in).

## Cause 5: running with `sudo` in a script for `--user`

`sudo systemctl --user ...` talks to **root's** user bus, which usually doesn't exist. Drop `sudo` for `--user` commands, or target the right user:

```bash
sudo systemctl --user -M otheruser@ status myapp.service
```
