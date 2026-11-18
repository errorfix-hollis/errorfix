---
error: "DNS_PROBE_FINISHED_NO_INTERNET"
error_full: |
  No internet
  Try:
    Checking the network cables, modem, and router
    Reconnecting to Wi-Fi
    Running Windows Network Diagnostics
  DNS_PROBE_FINISHED_NO_INTERNET
cat: web
description: "Chrome (or Edge) tried to resolve a hostname, the lookup failed, and its follow-up probe found no working connection. Either the machine is offline, or DNS is broken badly enough that Chrome thinks it is."
tldr: "Check if you're online at all (`ping 1.1.1.1`). If IPs work but names don't, it's DNS: set DNS to 1.1.1.1 / 8.8.8.8, flush the cache (`ipconfig /flushdns` on Windows, `sudo resolvectl flush-caches` on Linux, `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` on macOS) and clear Chrome's at chrome://net-internals/#dns. Disable VPN/proxy and restart the router."
keywords: dns_probe_finished_no_internet chrome no internet dns flush ipconfig flushdns change dns 8.8.8.8 1.1.1.1 vpn proxy router winsock reset net-internals
related: [web-err-name-not-resolved, linux-temporary-failure-in-name-resolution, web-err-connection-refused]
---
## What it means

Chrome's `DNS_PROBE_*` errors come from a lookup failure followed by a diagnostic probe. The `NO_INTERNET` variant means the probe couldn't reach a DNS server at all, so Chrome concludes there's no connectivity. Related variants:

- `DNS_PROBE_FINISHED_NXDOMAIN` – the name doesn't exist (typo, or DNS returned "no such domain").
- `DNS_PROBE_FINISHED_BAD_CONFIG` – the system DNS configuration is broken.
- `DNS_PROBE_POSSIBLE` – DNS failed and the probe didn't finish.

Start by telling apart "offline" from "DNS broken".

## Step 1: are you online?

```bash
ping 1.1.1.1          # an IP: no DNS involved
ping example.com      # a name: needs DNS
nslookup example.com 1.1.1.1
```

- Both fail → network problem (Wi-Fi, cable, router, captive portal). Reconnect, restart the router/modem, try another device.
- IP works, name fails → DNS problem, continue below.
- Both work but Chrome still fails → Chrome's own cache, proxy or secure DNS setting (Step 4).

## Step 2: switch to a public DNS server

ISP and router DNS servers are a frequent cause. Set 1.1.1.1 and 8.8.8.8 (or 9.9.9.9):

- **Windows**: Settings → Network & Internet → your adapter → DNS server assignment → Edit → Manual.
- **macOS**: System Settings → Network → your connection → Details → DNS.
- **Linux (NetworkManager)**:

```bash
nmcli con mod "<connection>" ipv4.dns "1.1.1.1 8.8.8.8" ipv4.ignore-auto-dns yes
nmcli con up "<connection>"
```

## Step 3: flush DNS caches and reset the network stack

Windows (admin Command Prompt):

```bat
ipconfig /flushdns
ipconfig /release
ipconfig /renew
netsh winsock reset
netsh int ip reset
```

Reboot after the `netsh` resets.

macOS:

```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

Linux with systemd-resolved:

```bash
sudo resolvectl flush-caches
resolvectl status
```

## Step 4: Chrome-specific checks

- Clear Chrome's host cache: open `chrome://net-internals/#dns` → "Clear host cache", then `chrome://net-internals/#sockets` → "Flush socket pools".
- Secure DNS: Settings → Privacy and security → Security → "Use secure DNS". Try switching it off, or pick a provider such as Cloudflare explicitly; some networks block DNS-over-HTTPS.
- Extensions: test in an Incognito window (extensions disabled by default).
- Proxy: Chrome uses the system proxy. Disable any proxy you don't recognise.

## Step 5: VPN, firewall and security software

A disconnected or half-connected VPN often leaves DNS pointing to an unreachable server. Disconnect it fully or reinstall its network adapter. Antivirus "web shields" and firewalls can block DNS; temporarily disable them to test.

## Step 6: hosts file and adapters

Check the hosts file for unexpected entries: `C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`. On Windows, outdated Wi-Fi drivers or a power-saving setting on the adapter can drop connectivity; update the driver, or in Device Manager uncheck "Allow the computer to turn off this device to save power".

## For site owners

If only *your* domain fails for visitors with `NXDOMAIN`, the DNS records are the problem: check them with `dig +trace yourdomain.com` and confirm the nameservers at your registrar.
