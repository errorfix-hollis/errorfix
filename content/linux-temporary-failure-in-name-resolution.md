---
error: "Temporary failure in name resolution"
error_full: |
  ping: google.com: Temporary failure in name resolution
  curl: (6) Could not resolve host: github.com
  socket.gaierror: [Errno -3] Temporary failure in name resolution
cat: linux
description: The system could not turn a hostname into an IP address because no DNS server answered. Usually no network, a broken /etc/resolv.conf, systemd-resolved down, or DNS blocked inside Docker/WSL.
tldr: "Check connectivity first: `ping -c1 1.1.1.1`. If IPs work but names don't, look at `cat /etc/resolv.conf` and `resolvectl status`; restart `sudo systemctl restart systemd-resolved` or set a working server (e.g. `DNS=1.1.1.1` in `/etc/systemd/resolved.conf`). In WSL fix `/etc/wsl.conf` + resolv.conf; in Docker set `\"dns\": [\"1.1.1.1\"]` in daemon.json."
keywords: linux temporary failure in name resolution dns resolv.conf systemd-resolved could not resolve host ping curl apt wsl docker container dns gaierror errno -3 nameserver
related: [linux-sudo-unable-to-resolve-host, linux-e-unable-to-locate-package, ssh-connection-timed-out]
---
## What it means

A program called the resolver (`getaddrinfo`) and no DNS server gave an answer. "Temporary" (`EAI_AGAIN`, Python `Errno -3`) means the lookup failed rather than the name not existing — that would be `Name or service not known`.

Narrow it down:

```bash
ping -c1 1.1.1.1                 # raw connectivity
ping -c1 google.com              # DNS
cat /etc/resolv.conf             # which DNS servers are used
resolvectl status                # systemd-resolved view (Ubuntu, Fedora)
dig @1.1.1.1 google.com +short   # bypass local config (apt install dnsutils)
```

- `1.1.1.1` fails too → it's networking, not DNS (no route, interface down, firewall).
- `dig @1.1.1.1` works but plain lookups don't → your configured resolver is the problem.

## Cause 1: no network at all

```bash
ip -br addr        # does the interface have an IP?
ip route           # is there a default route?
```

Bring the interface up / renew DHCP (`sudo dhclient -v eth0`, `sudo netplan apply`, or `nmcli networking on`). On a fresh VM, check that the hypervisor network adapter is attached.

## Cause 2: systemd-resolved stopped or misconfigured

On Ubuntu, `/etc/resolv.conf` points to the local stub `nameserver 127.0.0.53`. If `systemd-resolved` isn't running, nothing listens there:

```bash
systemctl status systemd-resolved
sudo systemctl restart systemd-resolved
```

Set upstream servers explicitly in `/etc/systemd/resolved.conf`:

```ini
[Resolve]
DNS=1.1.1.1 8.8.8.8
FallbackDNS=9.9.9.9
```

```bash
sudo systemctl restart systemd-resolved
resolvectl status
```

If `/etc/resolv.conf` was overwritten or is a broken symlink, restore it:

```bash
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
```

## Cause 3: empty or wrong /etc/resolv.conf (no systemd-resolved)

Minimal systems, containers and some VPNs leave it empty. A quick manual fix:

```bash
echo "nameserver 1.1.1.1" | sudo tee /etc/resolv.conf
```

This may be overwritten by NetworkManager, DHCP or resolvconf; for a permanent fix configure DNS there (e.g. `nmcli con mod <name> ipv4.dns "1.1.1.1 8.8.8.8"` then `nmcli con up <name>`).

## Cause 4: WSL 2

WSL generates `/etc/resolv.conf` from Windows. VPNs and some firewalls break it. Disable generation and set your own:

```bash
sudo tee /etc/wsl.conf <<'CONF'
[network]
generateResolvConf = false
CONF
```

Then in PowerShell run `wsl --shutdown`, reopen WSL, and:

```bash
sudo rm -f /etc/resolv.conf
echo "nameserver 1.1.1.1" | sudo tee /etc/resolv.conf
```

On recent Windows 11 builds, `dnsTunneling=true` under `[wsl2]` in `%UserProfile%\.wslconfig` fixes most VPN cases.

## Cause 5: inside Docker containers

Containers copy the host's resolv.conf, but `127.0.0.53` is unreachable from a container, so Docker substitutes public DNS — which a corporate network may block. Set DNS servers for the daemon in `/etc/docker/daemon.json`:

```json
{ "dns": ["10.0.0.2", "1.1.1.1"] }
```

```bash
sudo systemctl restart docker
```

Or per container: `docker run --dns 1.1.1.1 ...`. During `docker build`, try `docker build --network=host .`. Also check that a host firewall (ufw/iptables rules) isn't dropping traffic from the `docker0` bridge.

## Cause 6: a firewall blocks port 53

If `dig @1.1.1.1` times out but ping works, outbound UDP/TCP 53 is blocked. Use the DNS server your network provides (from DHCP), or allow it: `sudo ufw allow out 53`.
