---
error: "ssh: connect to host port 22: Connection refused"
error_full: |
  ssh: connect to host 192.168.1.50 port 22: Connection refused
cat: ssh
description: The machine was reached, but nothing accepted the connection on port 22 — sshd isn't running, isn't installed, listens on another port or address, or a firewall actively rejects the connection.
tldr: "On the server (via console): `sudo systemctl status ssh` (Debian/Ubuntu) or `sshd` (RHEL/Fedora/Arch); install with `sudo apt install openssh-server` and start with `sudo systemctl enable --now ssh`. Check the listening port with `sudo ss -ltnp | grep ssh` and connect with `ssh -p <port>` if it isn't 22. Open the firewall: `sudo ufw allow OpenSSH`."
keywords: ssh connect to host port 22 connection refused sshd not running openssh-server install systemctl ssh ufw firewalld port listen wsl raspberry pi docker
related: [ssh-connection-timed-out, ssh-kex-exchange-identification-connection-closed, ssh-permission-denied-publickey]
---
## What it means

"Connection refused" is a TCP-level answer: your packet reached a host, and that host replied with a reset (RST) because no program is listening on that port — or a firewall is configured to *reject* (not drop) it. This is good news compared with "Connection timed out": the network path works and the IP is right (or at least something answers at that IP).

Test from the client:

```bash
nc -vz 192.168.1.50 22
ssh -v user@192.168.1.50          # -v shows exactly where it stops
```

Everything else needs to happen on the server, through a console, cloud provider's serial/web console, or another access method.

## Cause 1: OpenSSH server isn't installed

Desktop installs of Ubuntu, Debian, Fedora Workstation and WSL don't include the SSH *server*, only the client.

```bash
# Debian / Ubuntu / Raspberry Pi OS
sudo apt update && sudo apt install openssh-server
# Fedora / RHEL / Rocky
sudo dnf install openssh-server
# Arch
sudo pacman -S openssh
```

On Raspberry Pi OS, SSH is disabled by default: enable it with `sudo raspi-config` → Interface Options → SSH, or create an empty file named `ssh` on the boot partition before first boot.

## Cause 2: sshd isn't running

The service name is `ssh` on Debian/Ubuntu and `sshd` on most others.

```bash
sudo systemctl status ssh          # or sshd
sudo systemctl enable --now ssh
```

If it fails to start, the reason is in the log (usually a config error):

```bash
sudo sshd -t                       # test config
journalctl -xeu ssh --no-pager | tail -30
```

On Ubuntu 22.10+ sshd is socket-activated: `ssh.socket` listens, not `ssh.service`. Check `systemctl status ssh.socket`. To change the port there, edit `/etc/ssh/sshd_config` and then run `sudo systemctl daemon-reload && sudo systemctl restart ssh.socket` (the socket unit is regenerated from the config).

## Cause 3: sshd listens on a different port or address

```bash
sudo ss -ltnp | grep -i ssh
# LISTEN 0 128 0.0.0.0:2222 ... users:(("sshd",pid=812,...))
```

If it shows another port, connect with it:

```bash
ssh -p 2222 user@192.168.1.50
```

Or put it in `~/.ssh/config`:

```text
Host myserver
    HostName 192.168.1.50
    Port 2222
    User me
```

If it listens only on `127.0.0.1:22`, check `ListenAddress` in `/etc/ssh/sshd_config` (and files in `/etc/ssh/sshd_config.d/`). Remove it or set `ListenAddress 0.0.0.0`.

## Cause 4: firewall rejects the port

```bash
sudo ufw status
sudo ufw allow OpenSSH             # or: sudo ufw allow 22/tcp

sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-service=ssh && sudo firewall-cmd --reload
```

A rejecting `iptables`/`nftables` rule (`-j REJECT`) produces "refused"; a dropping one produces a timeout. Cloud security groups usually drop, so they cause timeouts, not refusals.

## Cause 5: wrong host

The IP might belong to a different machine than you think (DHCP gave your server a new address, or the name resolves to an old IP). Verify with `ping`, `getent hosts myserver`, or check your router's DHCP leases. For a hostname with both IPv6 and IPv4 records, try `ssh -4 user@host`.

## Cause 6: containers and VMs

- **Docker:** containers don't run sshd. Use `docker exec -it <container> sh` instead. If you really run sshd in a container, publish the port (`-p 2222:22`) and connect to the host's port 2222.
- **VirtualBox NAT:** add a port forwarding rule (host 2222 → guest 22) and use `ssh -p 2222 user@127.0.0.1`.
- **WSL:** install and start `openssh-server` inside the distro, or connect to Windows' own OpenSSH server instead.

## Cause 7: your IP is banned by fail2ban

fail2ban with the `REJECT` action makes your IP get "refused" after too many failed logins. On the server: `sudo fail2ban-client status sshd` and `sudo fail2ban-client set sshd unbanip <your-ip>`.
