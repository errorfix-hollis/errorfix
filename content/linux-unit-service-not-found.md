---
error: "Failed to start nginx.service: Unit nginx.service not found."
error_full: |
  Failed to start nginx.service: Unit nginx.service not found.
  Failed to restart myapp.service: Unit myapp.service not found.
  Unit docker.service could not be found.
cat: linux
description: systemd has no unit file with that name loaded. The package isn't installed, the service has a different name, a custom unit file is in the wrong place, or systemd hasn't been reloaded after you created it.
tldr: "Find the real name with `systemctl list-unit-files | grep -i nginx`. Install the package if missing (`sudo apt install nginx`). For your own unit, put it in `/etc/systemd/system/myapp.service`, then `sudo systemctl daemon-reload && sudo systemctl enable --now myapp`. In WSL/containers without systemd, use `service nginx start` or enable systemd."
keywords: systemctl unit service not found failed to start could not be found systemd daemon-reload unit file /etc/systemd/system list-unit-files wsl
related: [linux-command-not-found, linux-address-already-in-use, linux-e-unable-to-locate-package]
---
## What it means

`systemctl start foo` asks systemd for the unit `foo.service`. systemd only knows units whose files are in its search paths (`/etc/systemd/system/`, `/run/systemd/system/`, `/lib/systemd/system/` or `/usr/lib/systemd/system/`) and that it has loaded since the last reload. If none match, you get `Unit ... not found`.

Search for anything similar:

```bash
systemctl list-unit-files | grep -i nginx
systemctl list-units --all | grep -i nginx
```

## Cause 1: the software isn't installed

The unit file comes with the package. Install it:

```bash
sudo apt install nginx           # Debian/Ubuntu
sudo dnf install nginx           # Fedora/RHEL
```

Check which package owns a unit on Debian/Ubuntu: `dpkg -S nginx.service`. Software installed from a tarball, `pip` or `npm` usually ships **no** unit at all; you write one (Cause 3).

## Cause 2: the service has a different name

Names vary by distro and version:

| You typed | Actual unit (examples) |
|-----------|------------------------|
| `mysql` | `mysql` (Ubuntu), `mysqld` (RHEL), `mariadb` |
| `postgresql` | `postgresql` (Ubuntu), `postgresql-16` (PGDG on RHEL) |
| `httpd` / `apache` | `apache2` (Debian/Ubuntu), `httpd` (RHEL) |
| `ssh` | `ssh` (Debian/Ubuntu), `sshd` (RHEL/Arch) |
| `docker` | `docker` (docker-ce), `snap.docker.dockerd` (snap) |

Snap services are named `snap.<name>.<app>`; list them with `snap services`.

## Cause 3: your own unit file isn't where systemd looks

Create it in `/etc/systemd/system/` with a `.service` extension:

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My app
After=network.target

[Service]
User=myapp
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/venv/bin/python app.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now myapp
systemctl status myapp
```

Files in your home directory, or with the wrong extension (`myapp.conf`, `myapp.service.txt`), are ignored. A symlink is fine (`sudo systemctl link /path/to/myapp.service`).

## Cause 4: you forgot `daemon-reload`

After creating, renaming or editing a unit file, systemd keeps using its old view until:

```bash
sudo systemctl daemon-reload
```

## Cause 5: it's a user service, not a system service

Units in `~/.config/systemd/user/` belong to your user manager. Manage them without sudo and with `--user`:

```bash
systemctl --user daemon-reload
systemctl --user start myapp
```

Running `sudo systemctl start myapp` looks in the system manager and won't find it (and vice versa).

## Cause 6: no systemd (WSL, Docker containers)

Containers normally run without systemd, and older WSL setups too, where you'll see `System has not been booted with systemd as init system`. Use the SysV wrapper, or start the program directly:

```bash
sudo service nginx start
```

On WSL2 you can enable systemd by adding this to `/etc/wsl.conf`, then running `wsl --shutdown` from Windows:

```ini
[boot]
systemd=true
```

In a Docker container, run the process in the foreground as the container's command instead (e.g. `CMD ["nginx", "-g", "daemon off;"]`).
