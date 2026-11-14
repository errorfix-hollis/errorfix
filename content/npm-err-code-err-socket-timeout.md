---
error: "npm ERR! code ERR_SOCKET_TIMEOUT"
error_full: |
  npm ERR! code ERR_SOCKET_TIMEOUT
  npm ERR! network Socket timeout
  npm ERR! network This is a problem related to network connectivity.
  npm ERR! network In most cases you are behind a proxy or have bad network settings.
  npm ERR! network
  npm ERR! network If you are behind a proxy, please make sure that the
  npm ERR! network 'proxy' config is set properly.  See: 'npm help config'
cat: npm
description: "npm opened a connection to the registry but no data arrived within the timeout. Causes: slow or flaky network, a proxy or VPN, IPv6 problems, too many parallel downloads, or a slow mirror."
tldr: "Retry with longer timeouts and fewer parallel sockets: `npm config set fetch-timeout 600000`, `npm config set fetch-retries 5`, `npm config set maxsockets 5`. Check the registry with `npm config get registry` and `npm ping`. Set or remove proxy settings (`npm config delete proxy`, `npm config delete https-proxy`). On Node 17+ IPv6 issues, try `NODE_OPTIONS=--dns-result-order=ipv4first npm install`."
keywords: npm err code err_socket_timeout network socket timeout fetch-timeout fetch-retries maxsockets proxy registry ipv6 npm install slow vpn yarn pnpm
related: [npm-err-code-etimedout, npm-self-signed-cert-in-chain, npm-err-code-eintegrity]
---
## What it means

npm connected to the registry (or a proxy/mirror), but the socket sat idle longer than allowed and npm gave up. It differs from `ETIMEDOUT`, where the *connection itself* couldn't be established ([ETIMEDOUT page](/npm/npm-err-code-etimedout/)). Both are network problems, not problems with your `package.json`.

Run with more logging to see which URL timed out:

```bash
npm install --loglevel=http
```

Check basics:

```bash
npm config get registry      # normally https://registry.npmjs.org/
npm ping
curl -I https://registry.npmjs.org/react
```

## Fix 1: longer timeouts, more retries, fewer sockets

A big install downloads many packages in parallel (`maxsockets` defaults to 15). On slow or lossy links some of those sockets starve and hit the timeout.

```bash
npm config set fetch-timeout 600000          # 10 min (default 300000)
npm config set fetch-retries 5               # default 2
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm config set maxsockets 5
npm install
```

These go into `~/.npmrc`. For a single run: `npm install --fetch-timeout=600000 --maxsockets=5`.

## Fix 2: proxy settings

Behind a corporate proxy, npm needs it explicitly:

```bash
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080
```

If you are **not** behind a proxy any more (laptop at home, VPN off), stale settings cause exactly this timeout. Remove them:

```bash
npm config list            # look for proxy / https-proxy
npm config delete proxy
npm config delete https-proxy
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
```

Also check the project's `.npmrc`, which overrides your user config.

## Fix 3: IPv6 / DNS problems

On Node 17+, DNS results are no longer sorted IPv4-first. If your network advertises IPv6 but doesn't route it, connections hang. Force IPv4 for the run:

```bash
NODE_OPTIONS=--dns-result-order=ipv4first npm install
```

On Windows PowerShell: `$env:NODE_OPTIONS="--dns-result-order=ipv4first"; npm install`. Updating to a current Node (20+) also helps, since it tries IPv4 and IPv6 in parallel.

## Fix 4: a slow or broken registry mirror

If `registry` points at a company Artifactory/Nexus or a regional mirror, it may be slow or down. Test against the public registry:

```bash
npm install --registry=https://registry.npmjs.org/
```

Lockfiles store full `resolved` URLs. If `package-lock.json` was created against an unreachable mirror, npm still fetches from there; regenerate it or rewrite those URLs.

## Fix 5: clean cache and retry

A half-written cache can cause repeated failures:

```bash
npm cache verify
npm cache clean --force   # if verify reports problems
rm -rf node_modules
npm install
```

## Fix 6: CI and Docker builds

- Docker Desktop / WSL2 on VPN: set DNS in Docker's `daemon.json`, or build with `--network host`.
- In CI, cache `~/.npm` between runs and use `npm ci`, which downloads less when the cache is warm.
- Add `--prefer-offline` to use cached packages without checking freshness.

## Yarn and pnpm equivalents

- Yarn 1: `yarn install --network-timeout 600000`
- Yarn Berry: `yarn config set httpTimeout 600000`
- pnpm: `pnpm install --network-concurrency 4 --fetch-timeout 600000`
