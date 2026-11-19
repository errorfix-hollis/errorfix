---
error: "ERR_CONNECTION_TIMED_OUT"
error_full: |
  This site can't be reached
  example.com took too long to respond.
  ERR_CONNECTION_TIMED_OUT
cat: web
description: "The browser sent a connection request but got no reply at all before giving up. Packets are being dropped somewhere: a firewall or cloud security group, a server that is down or listening on the wrong interface, wrong DNS pointing at a dead IP, or a local proxy/VPN problem."
tldr: "Test from a terminal: `curl -v --connect-timeout 10 https://example.com` and `nc -vz example.com 443`. If it times out everywhere, open the port in the server firewall (`sudo ufw allow 443/tcp`) and the cloud security group, and check the service is listening on `0.0.0.0` (`sudo ss -tlnp`). If only your machine fails, disable proxy/VPN and flush DNS."
keywords: err_connection_timed_out took too long to respond this site can't be reached chrome connection timed out firewall security group port 80 443 ufw ss -tlnp curl connect timeout proxy vpn
related: [web-err-connection-refused, web-err-name-not-resolved, ssh-connection-timed-out]
---
## What it means

DNS resolved the hostname to an IP, the browser sent a TCP SYN, and **nothing came back** — not even a rejection. Compare:

- `ERR_CONNECTION_REFUSED`: the host answered "nothing listens on this port" (fast).
- `ERR_CONNECTION_TIMED_OUT`: silence until the timeout (slow, ~20–30 s). Something drops the packets.

First find out whether the problem is the server or your side:

```bash
dig +short example.com               # which IP are we hitting?
curl -v --connect-timeout 10 https://example.com
nc -vz -w 5 example.com 443          # just test TCP
```

Try from another network (phone on mobile data) or an online "check host" service. If it works elsewhere, skip to Cause 5.

## Cause 1: firewall drops the port (most common on new servers)

A firewall with a DROP policy produces exactly this symptom. On the server:

```bash
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# firewalld
sudo firewall-cmd --permanent --add-service=http --add-service=https && sudo firewall-cmd --reload
```

On cloud VMs there is a **second** firewall outside the machine: AWS security groups / NACLs, GCP VPC firewall rules, Azure NSGs, Oracle Cloud security lists (Oracle images also ship restrictive iptables rules). Add an inbound rule for TCP 80/443 from `0.0.0.0/0`.

## Cause 2: service not reachable on the public interface

If the app listens only on `127.0.0.1`, connections from outside are usually refused, but behind some NAT/firewall setups they time out instead. Check:

```bash
sudo ss -tlnp | grep -E ':80|:443|:3000'
```

`127.0.0.1:3000` means localhost only — bind to `0.0.0.0` or put nginx in front. Also confirm the server is actually up (`systemctl status nginx`) and the VM isn't stopped.

## Cause 3: DNS points at the wrong or old IP

After migrating hosts, the A record may still point at an old server that silently drops traffic.

```bash
dig +short example.com A
dig +short example.com AAAA
```

A stale **AAAA** record is a classic: browsers prefer IPv6, the IPv6 address is unreachable, and the site times out for some users. Fix or delete the record.

## Cause 4: wrong port or URL

Typing `https://` for a server that only serves HTTP on a non-standard port, or using a port only open on the internal network (e.g. `:8080` blocked by the security group), times out. Check the exact URL and port you expect to be open.

## Cause 5: only your machine — proxy, VPN, local firewall

- Disable VPN and browser proxy extensions; in Chrome check *Settings → System → Open your computer's proxy settings*.
- Corporate networks often block outbound ports other than 80/443.
- Flush DNS and sockets: Windows `ipconfig /flushdns` then `netsh winsock reset` (reboot); macOS `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`; Chrome `chrome://net-internals/#dns` → *Clear host cache*.
- Antivirus "web shield" features can also hang connections — try disabling briefly.

## Cause 6: server overloaded

If the TCP connection succeeds but the response never arrives, you'll often get a timeout or a 504 from a proxy. Check server load (`uptime`, `top`) and the app's logs. See the [HTTP status codes](/tools/http-status-codes/) reference for what a proxy's 502/504 means.
