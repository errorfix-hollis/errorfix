---
error: "fatal: unable to access '...': Could not resolve proxy: proxy.example.com"
error_full: |
  fatal: unable to access 'https://github.com/user/repo.git/': Could not resolve proxy: proxy.example.com
cat: git
description: "Git (via curl) is configured to use an HTTP proxy whose hostname can't be resolved. A proxy setting is left over in git config or an environment variable, typically from an office network or VPN you're no longer on."
tldr: "Find the setting with `git config --show-origin --get-regexp 'https?.*proxy'` and `env | grep -i proxy`. Remove it: `git config --global --unset http.proxy` and `git config --global --unset https.proxy`, and `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY`. If you do need the proxy, fix its hostname or use its IP."
keywords: git could not resolve proxy unable to access http.proxy https.proxy unset proxy http_proxy environment variable corporate proxy vpn git config git clone push pull
related: [git-could-not-resolve-host, git-the-requested-url-returned-error-403, git-rpc-failed-curl-92-early-eof]
---
## What it means

For HTTPS remotes Git uses libcurl. When a proxy is configured, curl first resolves the **proxy's** hostname, not GitHub's. `Could not resolve proxy: X` means DNS lookup of `X` failed. Compare with `Could not resolve host: github.com`, where no proxy is involved and the remote's name fails.

So the fix is either to remove a proxy you don't need, or to make the proxy name resolvable.

## Step 1: find where the proxy comes from

Git config (all levels, with the file each comes from):

```bash
git config --show-origin --get-regexp 'https?\..*proxy'
```

Environment variables (curl honours both cases, plus `ALL_PROXY`):

```bash
env | grep -i proxy
```

On Windows PowerShell: `Get-ChildItem Env: | Where-Object Name -match proxy`.

## Fix 1: remove the git proxy setting

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
# if set at system or repo level:
sudo git config --system --unset http.proxy
git config --unset http.proxy          # inside the repo
```

Per-URL proxies look like `http.https://github.com.proxy`; remove them with the exact key shown in Step 1:

```bash
git config --global --unset http.https://github.com.proxy
```

## Fix 2: unset proxy environment variables

For the current shell:

```bash
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy
```

Then remove the `export ..._proxy=` lines from `~/.bashrc`, `~/.zshrc`, `~/.profile` or `/etc/environment` so they don't come back. On Windows, delete `HTTP_PROXY`/`HTTPS_PROXY` under System Properties → Environment Variables, then open a new terminal.

To bypass a proxy just for one command without changing anything:

```bash
git -c http.proxy= clone https://github.com/user/repo.git
```

## Fix 3: you need the proxy, but the name doesn't resolve

On a corporate network the proxy name often only resolves on the internal DNS or VPN. Connect the VPN, or use the proxy's IP:

```bash
git config --global http.proxy http://10.0.0.5:8080
```

Check it's reachable: `nslookup proxy.example.com` and `curl -I -x http://proxy.example.com:8080 https://github.com`.

If the proxy needs credentials: `http://user:password@proxy:8080` (URL-encode special characters in the password with a [URL encoder](/tools/url-encode-decode/)). Prefer a credential helper over storing passwords in config.

## Fix 4: proxy only for some hosts

Use per-URL settings so public hosts go direct:

```bash
git config --global http.https://git.internal.corp.proxy http://proxy.corp:8080
```

Or exclude hosts with `no_proxy`:

```bash
export no_proxy=localhost,127.0.0.1,github.com
```

## Fix 5: switch to SSH

SSH remotes don't use `http.proxy` at all:

```bash
git remote set-url origin git@github.com:user/repo.git
```

(This requires an SSH key added to your account, and port 22 or `ssh.github.com:443` must be reachable.)

## Typo in the proxy URL

A malformed value like `http.proxy=http//proxy:8080` or a stray space makes curl treat part of it as the hostname. Check the exact value with `git config --global --get http.proxy`.
