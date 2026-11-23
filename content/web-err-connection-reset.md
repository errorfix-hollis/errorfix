---
error: "ERR_CONNECTION_RESET"
error_full: |
  This site can't be reached
  The connection was reset.
  ERR_CONNECTION_RESET
cat: web
description: "The TCP connection was opened but then abruptly closed with a RST packet before a response arrived. Something between the browser and the site (firewall, proxy, antivirus, VPN, ISP filtering) or the server itself killed it."
tldr: "Try another network or a mobile hotspot, and disable VPN/proxy/antivirus HTTPS scanning to find who resets the connection. On Windows run `netsh winsock reset` and `netsh int ip reset`, then reboot. If it's your server, check that it isn't crashing mid-request, that the TLS port actually speaks TLS, and proxy/upload size limits; test with `curl -v https://site`."
keywords: err_connection_reset the connection was reset chrome edge firefox this site cant be reached netsh winsock reset vpn proxy firewall antivirus mtu tcp rst localhost connection reset by peer econnreset
related: [web-err-connection-refused, web-err-connection-timed-out, web-err-ssl-protocol-error]
---
## What it means

The browser connected, then received a TCP reset (RST). Compare:

- `ERR_CONNECTION_REFUSED`: nothing listening on the port; RST right away.
- `ERR_CONNECTION_TIMED_OUT`: no answer at all.
- `ERR_CONNECTION_RESET`: connection established, then forcibly killed, often during the TLS handshake or while sending/receiving data.

Firefox shows "The connection was reset"; `curl` shows `Connection reset by peer` (`curl: (35)` or `(56)`); Node shows `ECONNRESET`.

## Step 1: find out who resets it

```bash
curl -v https://example.com/
```

- Fails the same way on another network (mobile hotspot) too → server side.
- Works on another network/device → your machine, network, ISP or a middlebox.
- Only some sites fail, especially by name → filtering (corporate firewall, ISP blocking, parental controls) which often injects RSTs based on the hostname in the TLS SNI.

## Fix 1 (visitor): VPN, proxy, antivirus

Disable these one at a time and retry:

- VPN clients and browser VPN/proxy extensions
- system proxy (Windows: Settings > Network & internet > Proxy; turn off "Use a proxy server")
- antivirus "HTTPS scanning"/"web shield" (Avast, AVG, Kaspersky, ESET, Bitdefender)

Also try an incognito window (rules out extensions) and a different browser.

## Fix 2 (visitor): reset the network stack on Windows

Admin Command Prompt:

```bat
netsh winsock reset
netsh int ip reset
ipconfig /flushdns
```

Reboot afterwards. On macOS/Linux, toggling the interface or restarting the router clears most transient states.

## Fix 3: MTU problems on VPNs, PPPoE, tunnels

Small requests work but large pages or TLS handshakes with long certificate chains reset or hang. Test the path MTU:

```bash
ping -M do -s 1472 example.com     # Linux; macOS: ping -D -s 1472
```

If it fails, lower it step by step and set the interface MTU accordingly (e.g. 1400 for many VPNs), or enable MSS clamping on the router.

## Fix 4 (site owner): the server or app drops the connection

Common causes when *every* client sees it:

- **app crash mid-request**: the process dies (segfault, OOM kill) and the kernel resets the socket. Check app logs and `dmesg | grep -i oom`.
- **HTTP on an HTTPS port, or the reverse**: e.g. nginx `listen 443;` without `ssl`, so the TLS ClientHello gets a garbage reply. Use `listen 443 ssl;`. Test with `openssl s_client -connect host:443 -servername host`.
- **upload limits**: some servers reset instead of answering 413 when a body is too large. In nginx raise `client_max_body_size` (see [413 Request Entity Too Large](/web/web-nginx-413-request-entity-too-large/)).
- **keep-alive mismatch**: a backend closes idle keep-alive connections sooner than the proxy in front of it expects. Make the backend's keep-alive timeout longer than the proxy's (e.g. Node `server.keepAliveTimeout = 65000` behind an AWS ALB with 60 s idle timeout).
- **firewall / fail2ban / rate limiting** rejecting your IP with `REJECT --reject-with tcp-reset`. Check `sudo iptables -L -n` or `sudo nft list ruleset`.

## Fix 5: localhost dev servers

A dev server that crashes while handling the request resets the connection; check the terminal running it. A very common Docker case: the port is published (`-p 3000:3000`) but the app inside the container listens on `127.0.0.1`, so Docker's proxy accepts the connection and then gets nothing, giving `curl: (56) Recv failure: Connection reset by peer`. Bind the app to `0.0.0.0` inside containers and WSL (e.g. `vite --host 0.0.0.0`, `flask run --host=0.0.0.0`).
