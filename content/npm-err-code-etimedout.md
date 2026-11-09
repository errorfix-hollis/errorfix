---
error: "npm ERR! code ETIMEDOUT"
error_full: |
  npm ERR! code ETIMEDOUT
  npm ERR! syscall connect
  npm ERR! errno ETIMEDOUT
  npm ERR! network request to https://registry.npmjs.org/react failed, reason: connect ETIMEDOUT 104.16.27.34:443
  npm ERR! network This is a problem related to network connectivity.
  npm ERR! network In most cases you are behind a proxy or have bad network settings.
cat: npm
description: "npm could not reach the registry in time. The usual causes are a corporate proxy, a broken IPv6 route, a wrong registry URL or a flaky connection; the same fixes apply to ECONNRESET and ERR_SOCKET_TIMEOUT."
tldr: "Test with `curl -I https://registry.npmjs.org/`. Check `npm config get registry` and `npm config get proxy`; set the proxy with `npm config set proxy http://host:port` and `npm config set https-proxy http://host:port`, or remove a stale one with `npm config delete proxy` and `npm config delete https-proxy`. Raise timeouts: `npm config set fetch-retries 5` and `npm config set fetch-timeout 600000`."
keywords: npm err code etimedout econnreset err_socket_timeout network request failed registry.npmjs.org proxy behind a proxy npm install timeout
related: [npm-err-code-e404, npm-eresolve-unable-to-resolve-dependency-tree, web-curl-60-ssl-certificate-problem]
---
## What it means

npm opened a TCP connection to the registry (or a tarball URL) and nothing answered before the timeout. `ETIMEDOUT` = no response, `ECONNRESET` = the connection was cut mid-transfer, `ERR_SOCKET_TIMEOUT` = the socket went idle too long. npm itself is fine; the network path isn't.

First, check whether the registry is reachable outside npm:

```bash
curl -I https://registry.npmjs.org/
npm config get registry
npm ping
```

If `curl` also hangs, the problem is your network/proxy/DNS, not npm.

## Cause 1: behind a proxy (or a stale proxy setting)

On corporate networks, outbound HTTPS must go through a proxy:

```bash
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080
```

The reverse is just as common: a proxy configured long ago that no longer exists. List and remove:

```bash
npm config list            # look for proxy / https-proxy lines
npm config delete proxy
npm config delete https-proxy
env | grep -i proxy        # HTTP_PROXY / HTTPS_PROXY env vars are also used
```

Also check `~/.npmrc` and the project's `.npmrc`.

## Cause 2: wrong or unreachable registry

A leftover mirror or private registry URL (e.g. an old Verdaccio, Nexus or regional mirror) that is down will time out:

```bash
npm config get registry
npm config set registry https://registry.npmjs.org/
```

Also look in `package-lock.json`: `resolved` URLs pointing at a dead host will keep failing. Regenerate the lock file or replace the host.

## Cause 3: IPv6 route is broken

If your machine has an IPv6 address but no working IPv6 route, Node may try IPv6 first and hang. Node 17+ uses the OS address order. Prefer IPv4:

```bash
export NODE_OPTIONS=--dns-result-order=ipv4first
npm install
```

Or disable IPv6 on the interface if you don't use it.

## Cause 4: slow or flaky connection (VPN, Wi-Fi, CI)

Increase retries and timeouts:

```bash
npm config set fetch-retries 5
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm config set fetch-timeout 600000
```

Reduce parallel connections, which helps on weak links and with `ECONNRESET`:

```bash
npm config set maxsockets 5
```

## Cause 5: firewall, antivirus or VPN interference

Some VPNs and TLS-inspecting firewalls drop long downloads. Try disconnecting the VPN, or another network (phone hotspot) to confirm. If the firewall re-signs TLS you'll usually see `SELF_SIGNED_CERT_IN_CHAIN` instead — configure `cafile` rather than disabling `strict-ssl`.

## After fixing

Clear partial downloads and retry:

```bash
npm cache verify
npm install
```

In Docker builds, the container may not inherit your host's proxy; pass it with `docker build --build-arg HTTPS_PROXY=http://proxy:8080 .`.
