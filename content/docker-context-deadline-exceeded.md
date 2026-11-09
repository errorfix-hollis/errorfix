---
error: "Error response from daemon: Get \"https://registry-1.docker.io/v2/\": context deadline exceeded"
error_full: |
  Error response from daemon: Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)
  Error response from daemon: Get "https://registry-1.docker.io/v2/": context deadline exceeded
cat: docker
description: "The Docker daemon could not reach the registry before its timeout. The cause is almost always DNS, a proxy the daemon doesn't know about, an MTU/VPN problem, or a blocked registry."
tldr: "Test from the host: `curl -v https://registry-1.docker.io/v2/` (401 = reachable). Fix DNS in `/etc/docker/daemon.json` with `{\"dns\": [\"1.1.1.1\", \"8.8.8.8\"]}`, or give the daemon your proxy via a systemd drop-in (`Environment=HTTPS_PROXY=...`), then `sudo systemctl restart docker`."
keywords: docker pull context deadline exceeded registry-1.docker.io v2 client.timeout exceeded while awaiting headers request canceled while waiting for connection docker login timeout proxy dns
related: [docker-toomanyrequests-pull-rate-limit, docker-error-getting-credentials, linux-temporary-failure-in-name-resolution]
---
## What it means

`context deadline exceeded` is Go's generic "timed out" error. Here the **daemon** (dockerd), not your CLI, tried to connect to the registry and got no answer in time. It happens on `docker pull`, `docker login`, `docker build` (pulling the base image) and `docker push`.

Important: the daemon runs as a system service. Proxy variables and DNS settings in your shell do **not** apply to it.

First check basic reachability from the host:

```bash
curl -v https://registry-1.docker.io/v2/
```

A `401 Unauthorized` response means the network is fine (Docker Hub requires a token). A hang points to DNS, proxy or firewall.

## Cause 1: DNS resolution fails or is slow

```bash
nslookup registry-1.docker.io
resolvectl status          # systemd-resolved hosts
```

Set explicit DNS servers for the daemon in `/etc/docker/daemon.json`:

```json
{
  "dns": ["1.1.1.1", "8.8.8.8"]
}
```

```bash
sudo systemctl restart docker
```

The `dns` key affects containers; if the host itself can't resolve, fix `/etc/resolv.conf` first (see [Temporary failure in name resolution](/linux/linux-temporary-failure-in-name-resolution/)). Validate the JSON before restarting — a syntax error stops dockerd from starting ([JSON formatter](/tools/json-formatter/)).

## Cause 2: you are behind a proxy

Configure the proxy for the daemon with a systemd drop-in:

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf <<'CONF'
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:3128"
Environment="HTTPS_PROXY=http://proxy.example.com:3128"
Environment="NO_PROXY=localhost,127.0.0.1,.internal"
CONF
sudo systemctl daemon-reload
sudo systemctl restart docker
systemctl show --property=Environment docker
```

Docker Engine 23+ also accepts `"proxies": {"http-proxy": "...", "https-proxy": "...", "no-proxy": "..."}` in `daemon.json`. On Docker Desktop use Settings → Resources → Proxies.

## Cause 3: VPN or MTU problems

TLS handshakes that stall (connection opens, then hangs) often mean packets larger than the tunnel MTU are dropped. Test with the VPN off. If that fixes it, lower the MTU on the VPN interface or for Docker:

```json
{ "mtu": 1400 }
```

## Cause 4: registry mirror misconfigured or down

A dead `registry-mirrors` entry in `daemon.json` causes timeouts before Docker falls back:

```bash
docker info | grep -A3 "Registry Mirrors"
```

Remove the mirror or fix its URL, then restart Docker.

## Cause 5: IPv6 without a working route

If the host prefers IPv6 but can't route it, connections hang. Check with `curl -6 -v https://registry-1.docker.io/v2/`. Disable IPv6 on the interface or fix the route.

## Cause 6: Docker Desktop / WSL 2 networking

On Windows, restart WSL (`wsl --shutdown`) and Docker Desktop. Corporate VPN clients commonly break WSL 2 DNS; setting `dns` in Docker Desktop's Docker Engine JSON settings usually fixes it.

## Retry

Once `curl` returns 401 quickly, `docker pull` will work. Transient Hub outages also produce this error — check status.docker.com before changing config.
