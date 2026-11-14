---
error: "fatal: unable to access ... Could not resolve host: github.com"
error_full: |
  fatal: unable to access 'https://github.com/user/repo.git/': Could not resolve host: github.com
cat: git
description: "Git couldn't turn the hostname into an IP address, so it never reached the server. It's a DNS or network problem (offline, VPN, proxy, broken resolver), or a typo in the remote URL."
tldr: "Test DNS outside Git: `ping github.com` or `nslookup github.com`. Check the remote URL with `git remote -v`. If you're behind a proxy set `git config --global http.proxy http://proxy:port`; if a stale proxy is configured remove it with `git config --global --unset http.proxy`. On Linux/WSL fix `/etc/resolv.conf` (e.g. `nameserver 1.1.1.1`)."
keywords: git fatal unable to access could not resolve host github.com dns proxy vpn wsl resolv.conf git remote -v clone push pull network
related: [git-could-not-read-from-remote-repository, linux-temporary-failure-in-name-resolution, git-remote-end-hung-up-unexpectedly]
---
## What it means

Before Git (via curl) can connect over HTTPS it must resolve the host in the URL (`github.com`, `gitlab.com`, `dev.azure.com`, ...) to an IP address. `Could not resolve host` means that DNS lookup failed. Authentication, permissions and the repository itself are not involved yet.

First check whether it's Git-specific or the whole machine:

```bash
nslookup github.com
ping -c 3 github.com        # Windows: ping github.com
curl -sI https://github.com | head -1
```

If those fail too, it's the network/DNS. If they work, look at the URL and Git's proxy settings.

## Cause 1: typo or odd hostname in the remote URL

```bash
git remote -v
```

Look for `githb.com`, a missing dot, an extra space, or a company host that only resolves on the VPN. Fix it:

```bash
git remote set-url origin https://github.com/user/repo.git
```

## Cause 2: a proxy setting that is wrong or no longer needed

A proxy configured for an office network breaks Git at home (and vice versa). The error then often names the *proxy* host: `Could not resolve proxy: proxy.corp.local`.

```bash
git config --global --get http.proxy
git config --global --get https.proxy
env | grep -i proxy
```

Remove stale settings:

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY
```

Or set the correct one:

```bash
git config --global http.proxy http://user:pass@proxy.example.com:8080
```

You can scope it to one host: `git config --global http.https://github.com.proxy http://proxy:8080`.

## Cause 3: broken DNS on Linux or WSL

Check the resolver:

```bash
cat /etc/resolv.conf
resolvectl status          # systemd-resolved
```

On WSL2 the auto-generated `resolv.conf` sometimes points to an unreachable address, especially with a VPN. Set a fixed resolver:

```ini
# /etc/wsl.conf
[network]
generateResolvConf = false
```

```bash
sudo rm /etc/resolv.conf
echo "nameserver 1.1.1.1" | sudo tee /etc/resolv.conf
```

Then run `wsl --shutdown` from Windows and reopen. On newer WSL you can instead enable `dnsTunneling=true` under `[wsl2]` in `%UserProfile%\.wslconfig`. More on Linux DNS in [Temporary failure in name resolution](/linux/linux-temporary-failure-in-name-resolution/).

## Cause 4: VPN, firewall or captive portal

- A VPN may push its own DNS servers that don't resolve public names (or only resolve internal ones). Try with the VPN off, or ask for split DNS.
- Hotel/airport Wi-Fi blocks DNS until you log in through the browser.
- Corporate DNS filters may block a host; try `nslookup github.com 1.1.1.1` to compare.

Flush the DNS cache after network changes:

```bash
# Windows
ipconfig /flushdns
# macOS
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
# Linux (systemd-resolved)
resolvectl flush-caches
```

## Cause 5: Docker builds and CI runners

`RUN git clone ...` in a Dockerfile uses the build container's DNS. If the host works but the build doesn't, set DNS for the daemon in `/etc/docker/daemon.json` (`"dns": ["1.1.1.1", "8.8.8.8"]`) and restart Docker, or build with `--network host`.

## Workaround: use SSH instead of HTTPS

This doesn't fix DNS (SSH needs to resolve `github.com` too), but if only HTTPS is blocked by a proxy, SSH over port 443 often works:

```
# ~/.ssh/config
Host github.com
  HostName ssh.github.com
  Port 443
  User git
```

```bash
git remote set-url origin git@github.com:user/repo.git
```
