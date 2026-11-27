---
error: "Failed to start service: Unit is masked."
error_full: |
  Failed to start nginx.service: Unit nginx.service is masked.
cat: linux
description: "The systemd unit has been masked, meaning it is linked to /dev/null so it cannot be started manually or as a dependency. Unmask it, then start it."
tldr: "Run `sudo systemctl unmask nginx.service`, then `sudo systemctl daemon-reload` and `sudo systemctl enable --now nginx.service`. If unmask doesn't help, delete the `/etc/systemd/system/nginx.service` symlink to /dev/null yourself."
keywords: systemd failed to start unit is masked systemctl unmask masked service dev null symlink enable start ubuntu debian
related: [linux-unit-service-not-found, linux-job-for-service-failed-because-the-control-process-exited-with-error-code, linux-start-request-repeated-too-quickly]
---
## What it means

`systemctl mask` is a stronger form of `disable`: it creates a symlink from `/etc/systemd/system/<unit>` to `/dev/null`. A masked unit cannot be started at all — not by you, not at boot, not as a dependency of another unit. Check it:

```bash
systemctl status nginx.service        # shows "Loaded: masked (Reason: Unit nginx.service is masked.)"
systemctl is-enabled nginx.service    # prints "masked"
ls -l /etc/systemd/system/nginx.service
# /etc/systemd/system/nginx.service -> /dev/null
```

## Fix 1: unmask and start

```bash
sudo systemctl unmask nginx.service
sudo systemctl daemon-reload
sudo systemctl enable --now nginx.service
```

`enable --now` both enables it at boot and starts it immediately.

## Fix 2: the symlink is in a different place

Units can also be masked at runtime (`systemctl mask --runtime`, under `/run/systemd/system/`) or for the user manager (`systemctl --user mask`). Find any `/dev/null` links:

```bash
find /etc/systemd /run/systemd /usr/lib/systemd ~/.config/systemd -lname /dev/null 2>/dev/null
```

For user units: `systemctl --user unmask myapp.service`. If `unmask` reports nothing but the unit is still masked, remove the symlink manually and reload:

```bash
sudo rm /etc/systemd/system/nginx.service
sudo systemctl daemon-reload
```

Only remove it if it really is a link to `/dev/null` — not a real unit file you created.

## Cause: a package or another service masked it

Some packages mask units on purpose:

- **Ubuntu `systemd-timesyncd` vs `chrony`/`ntp`**: installing one masks or disables the other.
- **`hostapd`** on Debian/Raspberry Pi OS is masked after install until you configure it.
- **`docker.socket` / `docker.service`**: some guides mask these; unmask both.
- **Sleep targets**: `sleep.target`, `suspend.target`, `hibernate.target` are often masked to disable suspend.

```bash
sudo systemctl unmask docker.service docker.socket
sudo systemctl start docker
```

If another package intentionally masked the unit (two conflicting services), unmasking may bring the conflict back — decide which one you want and stop/mask the other.

## To mask on purpose

```bash
sudo systemctl mask --now apache2.service   # stop and prevent any start
```
