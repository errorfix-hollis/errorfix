---
error: "ssh: connect to host port 22: No route to host"
error_full: |
  ssh: connect to host 192.168.1.50 port 22: No route to host
cat: ssh
description: "Your machine couldn't reach the target IP at the network level. Either the host is down/unreachable (no ARP reply on the local network, no route), or a firewall on the target actively rejects the connection with an ICMP host-unreachable message."
tldr: "Check the host is up and the IP is right: `ping 192.168.1.50`, `ip route get 192.168.1.50`. If it pings but SSH says no route, the target's firewall is rejecting port 22: allow it with `sudo firewall-cmd --permanent --add-service=ssh && sudo firewall-cmd --reload` (RHEL/Fedora) or `sudo ufw allow ssh` (Ubuntu). Also check VPN, wrong subnet and whether the VM/container network is bridged."
keywords: ssh connect to host port 22 no route to host ehostunreach firewall firewalld ufw icmp host-prohibited ping arp wrong ip vpn virtualbox nat bridged raspberry pi
related: [ssh-connection-timed-out, ssh-connect-to-host-port-22-connection-refused, ssh-could-not-resolve-hostname]
---
## What it means

`No route to host` is `EHOSTUNREACH`. Compare with similar SSH errors:

| Error | Meaning |
|---|---|
| `Connection refused` | Host reached, nothing listening on 22 |
| `Connection timed out` | Packets silently dropped |
| `No route to host` | Host unreachable, or a firewall *rejected* with ICMP host-unreachable / host-prohibited |

So two very different situations produce it: the host really isn't there, or it is there and its firewall says no.

## Step 1: is the host reachable at all?

```bash
ping -c 3 192.168.1.50
ip route get 192.168.1.50     # which interface/gateway would be used
ip neigh | grep 192.168.1.50  # on the same LAN: FAILED/INCOMPLETE = no ARP reply
```

- **No ping reply and ARP `FAILED`** on a local network: the machine is off, asleep, on another network, or has a different IP now (DHCP). Check the IP on the target (`ip -4 addr`) or your router's client list. Raspberry Pis and laptops often get a new address after a reboot; give them a DHCP reservation.
- **Wrong subnet**: you're on `192.168.0.x` and the target is `192.168.1.x` with no router between them. Connect to the same network or add a route.
- **VPN**: a full-tunnel VPN can route the LAN subnet into the tunnel. Disconnect it or enable "allow local network access".

## Step 2: host pings, but SSH says no route - firewall

RHEL, CentOS, Fedora and Rocky's `firewalld` (and iptables rules ending in `REJECT --reject-with icmp-host-prohibited`) return this error for blocked ports. On the target:

```bash
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-service=ssh    # or --add-port=2222/tcp
sudo firewall-cmd --reload
```

Ubuntu/Debian with ufw:

```bash
sudo ufw status
sudo ufw allow OpenSSH
```

Raw iptables: `sudo iptables -L INPUT -n --line-numbers` and look for a `REJECT` before an `ACCEPT` for port 22.

Also make sure `sshd` is actually running and listening: `sudo ss -ltnp | grep sshd`.

## Step 3: virtual machines and containers

- **VirtualBox/VMware with NAT**: the VM's `10.0.2.15` isn't reachable from the host. Use a bridged or host-only adapter, or a port forward (host 2222 → guest 22) and `ssh -p 2222 user@127.0.0.1`.
- **WSL2**: the WSL VM is behind NAT. Use `localhost` from Windows, or enable mirrored networking (`networkingMode=mirrored` in `.wslconfig`).
- **Docker**: containers on the default bridge aren't reachable by their IP from other machines; publish the port (`-p 2222:22`).

## Step 4: cloud servers

In AWS, GCP and Azure a missing security group/firewall rule normally causes a *timeout*, but a wrong subnet route table, a stopped instance, or an IP that changed after stop/start can give `No route to host`. Check the instance state and current public IP, and that port 22 is allowed from your IP.

## Debug output

```bash
ssh -v user@192.168.1.50
nc -vz 192.168.1.50 22
```

If `nc` also fails with no route, the problem is the network or firewall, not SSH keys or config.
