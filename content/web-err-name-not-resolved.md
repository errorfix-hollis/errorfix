---
error: "ERR_NAME_NOT_RESOLVED"
error_full: |
  This site can't be reached
  Check if there is a typo in example.com.
  DNS_PROBE_FINISHED_NXDOMAIN
  net::ERR_NAME_NOT_RESOLVED
cat: web
description: "The browser couldn't turn the hostname into an IP address: the DNS lookup failed. Either the name is wrong or not yet published, or DNS on this machine/network is broken or blocked."
tldr: "Check the hostname for typos, then test with `nslookup example.com 1.1.1.1`. If public DNS resolves it, flush your local cache (`ipconfig /flushdns` on Windows, `sudo resolvectl flush-caches` on Linux, `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` on macOS) and fix your DNS server. If nobody resolves it, add or fix the DNS record."
keywords: err_name_not_resolved net::err_name_not_resolved dns_probe_finished_nxdomain this site can't be reached dns lookup failed chrome flush dns nslookup
related: [web-err-connection-refused, linux-temporary-failure-in-name-resolution, git-could-not-resolve-host]
---
## What it means

Before connecting, the browser asks DNS for the IP of the hostname. `ERR_NAME_NOT_RESOLVED` (often shown with `DNS_PROBE_FINISHED_NXDOMAIN`) means that lookup returned "no such domain" or nothing at all. No connection to the server was ever attempted, so it's not a server/firewall problem.

In the console of a web app you may see it as `GET https://api.example.com/... net::ERR_NAME_NOT_RESOLVED` for a single request; the same causes apply to that API hostname.

## Step 1: is it only you?

```bash
nslookup example.com            # your configured DNS
nslookup example.com 1.1.1.1    # Cloudflare public DNS
dig +short example.com @8.8.8.8 # Google public DNS
```

- **Public DNS fails too** -> the record doesn't exist (Cause 1/2).
- **Public DNS works, yours fails** -> local DNS problem (Cause 3/4).

## Cause 1: typo or wrong hostname

Check spelling, the TLD (`.com` vs `.co`), and for apps the config: an env var like `API_URL=https://api.exmple.com` or a leftover `localhost`-style internal hostname (e.g. a Docker service name like `http://backend:8000` used from the browser, which only resolves inside the Docker network - use the public URL or a dev-server proxy).

## Cause 2: the DNS record doesn't exist (yet)

For your own domain:

- Make sure an `A`/`AAAA` or `CNAME` record exists for the exact name (`www` and the apex `@` are separate records).
- Check the domain's nameservers point to the DNS provider where you added the records: `dig NS example.com +short`.
- New domains and nameserver changes can take minutes to hours to propagate. Expired domains also stop resolving - check `whois example.com`.

## Cause 3: stale local DNS cache

Flush it, then restart the browser:

```bash
# Windows
ipconfig /flushdns
# macOS
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
# Linux (systemd-resolved)
sudo resolvectl flush-caches
```

Chrome has its own cache: open `chrome://net-internals/#dns` and click **Clear host cache**.

## Cause 4: broken or blocking DNS server

Your router/ISP resolver may be down or filtering. Switch to a public resolver (1.1.1.1, 8.8.8.8):

- **Windows**: Settings -> Network -> adapter -> DNS server assignment -> Manual.
- **macOS**: System Settings -> Network -> Details -> DNS.
- **Linux**: see [Temporary failure in name resolution](/linux/linux-temporary-failure-in-name-resolution/).

Also check:

- **VPN / corporate network**: internal names only resolve while connected to the VPN; some VPNs break DNS after disconnecting (reconnect or restart the network adapter).
- **Ad blockers / Pi-hole / NextDNS** blocking the domain.
- **Chrome "Secure DNS"** (Settings -> Privacy and security -> Security -> Use secure DNS) pointing at a provider that fails; try turning it off.

## Cause 5: hosts file entries

A wrong or leftover entry overrides DNS:

- Linux/macOS: `/etc/hosts`
- Windows: `C:\Windows\System32\drivers\etc\hosts`

Remove lines for the hostname you're trying to reach.

## Cause 6: no network at all

If *every* site fails with this, you're probably offline or connected to a captive portal (hotel/airport Wi-Fi). Open `http://neverssl.com` to trigger the login page.
