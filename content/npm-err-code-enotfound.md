---
error: "npm ERR! code ENOTFOUND"
error_full: |
  npm ERR! code ENOTFOUND
  npm ERR! syscall getaddrinfo
  npm ERR! errno ENOTFOUND
  npm ERR! network request to https://registry.npmjs.org/express failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org
  npm ERR! network This is a problem related to network connectivity.
cat: npm
description: "npm couldn't resolve the registry's hostname (getaddrinfo failed). Either DNS/internet is broken on this machine, the registry URL in your npm config is wrong, or a proxy setting points to a host that doesn't exist."
tldr: "Test DNS with `nslookup registry.npmjs.org`. Check `npm config get registry` (should be `https://registry.npmjs.org/` unless you use a private registry) and `npm config get proxy` / `npm config get https-proxy`; remove stale ones with `npm config delete proxy` and `npm config delete https-proxy`. Look for overrides in `.npmrc` files in the project and home directory."
keywords: npm err code enotfound getaddrinfo enotfound registry.npmjs.org network request failed proxy https-proxy npmrc registry dns wsl vpn npm install
related: [npm-err-code-etimedout, npm-err-code-err-socket-timeout, linux-temporary-failure-in-name-resolution]
---
## What it means

`getaddrinfo ENOTFOUND <host>` is the operating system saying the hostname could not be resolved to an IP address. npm never got as far as connecting. The hostname in the message tells you where to look:

- `registry.npmjs.org`: general DNS / connectivity problem;
- a misspelled or internal registry host (`registry.npmjs.og`, `nexus.corp.local`): your npm config;
- a proxy host (`proxy.company.com`): your proxy settings;
- `github.com` / `codeload.github.com`: a dependency installed from Git.

(npm 10 prints `npm error` instead of `npm ERR!`; the fix is the same.)

## Fix 1: check DNS and connectivity

```bash
nslookup registry.npmjs.org
curl -I https://registry.npmjs.org/
```

If `nslookup` fails too, it's not npm. Check your network, VPN, and DNS server. On Linux see the "Temporary failure in name resolution" page. On WSL 2 a broken `/etc/resolv.conf` is a common cause; restarting WSL with `wsl --shutdown` (from Windows) regenerates it.

## Fix 2: wrong registry URL

```bash
npm config get registry
# should usually print https://registry.npmjs.org/
npm config set registry https://registry.npmjs.org/
```

Settings can come from several files: the project's `.npmrc`, `~/.npmrc`, the global npmrc, and environment variables like `npm_config_registry`. See all of them and where they're defined:

```bash
npm config list
npm config ls -l | grep -i registry
```

A scoped registry (`@company:registry=https://npm.company.internal/`) only affects that scope; if the internal host is only reachable over VPN, connect first.

## Fix 3: stale or wrong proxy settings

Proxy settings left over from an office network make npm try to resolve a proxy host that doesn't exist at home:

```bash
npm config get proxy
npm config get https-proxy
npm config delete proxy
npm config delete https-proxy
```

Also check `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY` environment variables (`env | grep -i proxy`). If you do need a proxy:

```bash
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

## Fix 4: lockfile points to another registry

`package-lock.json` stores the full `resolved` URL of every package. A lockfile created against a private mirror keeps pointing there even if your registry setting is the public one. Search for it:

```bash
grep -o '"resolved": "https://[^/]*' package-lock.json | sort | uniq -c
```

If the host is unreachable for you, regenerate the lockfile with the correct registry configured (`rm package-lock.json && npm install`), and commit the result if that's intended for the team.

## Fix 5: Docker builds and CI

Inside `docker build`, DNS comes from the Docker daemon. If `npm install` fails only there, test with `docker run --rm node:20 getent hosts registry.npmjs.org`. Corporate DNS that the daemon can't use may need `"dns": ["10.0.0.2"]` in `/etc/docker/daemon.json` (then restart Docker). In CI, make sure the runner can reach your private registry and that the `.npmrc` with the right registry is present at install time.

## Retry transient failures

For flaky networks, npm retries failed fetches; you can raise the number of retries with `npm config set fetch-retries 5`.
