---
error: "fatal: unable to access 'https://github.com/...': Failed to connect to github.com port 443"
error_full: |
  fatal: unable to access 'https://github.com/user/repo.git/': Failed to connect to github.com port 443 after 21045 ms: Couldn't connect to server
  fatal: unable to access 'https://github.com/user/repo.git/': Failed to connect to github.com port 443: Connection timed out
cat: git
description: "Git resolved github.com but could not open a TCP connection on HTTPS port 443. Usually a proxy setting (stale or missing), a VPN/firewall block, or a network that blocks GitHub."
tldr: "Check with `curl -v https://github.com`. If you set a proxy before and no longer need it, remove it: `git config --global --unset http.proxy` and `git config --global --unset https.proxy` (also check `HTTPS_PROXY` env vars). If you are behind a proxy, set it: `git config --global http.proxy http://proxy:8080`. Otherwise switch VPN/network, or use SSH."
keywords: git fatal unable to access failed to connect to github.com port 443 after ms couldn't connect to server connection timed out http.proxy https_proxy vpn firewall clone push pull
related: [git-could-not-resolve-host, git-could-not-resolve-proxy, git-ssl-certificate-problem-unable-to-get-local-issuer-certificate]
---
## What it means

DNS worked (otherwise you'd see `Could not resolve host`), but the TCP connection to port 443 never completed. Something between you and GitHub is dropping or refusing the connection, or Git is sending traffic to a proxy that isn't there.

First test outside Git:

```bash
curl -v https://github.com -o /dev/null
```

- curl also fails → network/firewall/VPN/proxy problem on the machine.
- curl works, git fails → Git has its own (wrong) proxy setting.

## Cause 1: a stale proxy configured in Git

Very common after following a "set a proxy" tutorial, or using a corporate laptop at home. Look for proxy settings:

```bash
git config --show-origin --get-regexp 'https?\..*proxy'
env | grep -i proxy
```

Remove the ones you don't need:

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY
```

On Windows also check *Settings → Network → Proxy* and environment variables in *System Properties*.

## Cause 2: you are behind a proxy and Git doesn't know

On corporate networks direct traffic to port 443 is blocked; only the proxy is allowed. Set it for Git:

```bash
git config --global http.proxy http://proxy.example.com:8080
# with auth
git config --global http.proxy http://user:pass@proxy.example.com:8080
# only for GitHub
git config --global http.https://github.com.proxy http://proxy.example.com:8080
```

Local proxy tools (Clash, v2ray etc.) usually listen on `127.0.0.1:7890` or similar: `git config --global http.proxy http://127.0.0.1:7890`. If the tool is turned off, this setting causes exactly this error (back to cause 1).

## Cause 3: VPN, firewall or antivirus

- Disconnect/reconnect the VPN, or try without it.
- Some security software intercepts HTTPS; temporarily disable it to test.
- Try another network (phone hotspot). If it works there, your network blocks GitHub.

## Cause 4: IPv6 route is broken

If github.com resolves to an IPv6 address on a network without working IPv6, connections time out. Test:

```bash
curl -4 -v https://github.com -o /dev/null
```

If `-4` works, tell Git to use IPv4 for that command:

```bash
git clone -4 https://github.com/user/repo.git
git fetch -4
git push -4
```

For a permanent fix, make the system prefer IPv4 (uncomment `precedence ::ffff:0:0/96  100` in `/etc/gai.conf` on Linux) or fix IPv6 on the network.

## Workaround: use SSH (port 22 or 443)

If HTTPS is blocked but SSH isn't:

```bash
git remote set-url origin git@github.com:user/repo.git
```

If port 22 is blocked too, GitHub accepts SSH on port 443 via `ssh.github.com`. Add to `~/.ssh/config`:

```
Host github.com
  Hostname ssh.github.com
  Port 443
  User git
```

Test with `ssh -T git@github.com`.
