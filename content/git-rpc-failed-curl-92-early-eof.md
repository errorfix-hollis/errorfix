---
error: "error: RPC failed; curl 92 HTTP/2 stream 0 was not closed cleanly"
error_full: |
  error: RPC failed; curl 92 HTTP/2 stream 5 was not closed cleanly: CANCEL (err 8)
  error: 6745 bytes of body are still expected
  fetch-pack: unexpected disconnect while reading sideband packet
  fatal: early EOF
  fatal: fetch-pack: invalid index-pack output
cat: git
description: The HTTPS connection to the Git server dropped in the middle of a clone, fetch or push — usually a large repo over a flaky network, an HTTP/2 issue, or a proxy/timeout cutting the transfer.
tldr: "Retry with HTTP/1.1: `git config --global http.version HTTP/1.1`. For huge repos clone shallow first: `git clone --depth 1 <url>` then `git fetch --unshallow`. For pushes of big files, `git config http.postBuffer 524288000` can help; or switch the remote to SSH."
keywords: git error rpc failed curl 92 http/2 stream not closed cleanly early eof fetch-pack unexpected disconnect invalid index-pack output curl 18 curl 56 postbuffer clone large repo
related: [git-failed-to-push-some-refs, git-gh001-large-files-detected, git-could-not-read-from-remote-repository]
---
## What it means

Git over HTTPS uses libcurl. `RPC failed` means the HTTP request carrying the pack data failed; the curl code says how:

- `curl 92 HTTP/2 stream ... was not closed cleanly` — HTTP/2 stream reset mid-transfer
- `curl 18 transfer closed with outstanding read data remaining` — connection closed early
- `curl 56 ... Connection reset by peer` / `GnuTLS recv error` — network or TLS layer dropped
- `early EOF` / `invalid index-pack output` — the pack Git was receiving was cut short

It's a transport problem, not a problem with your repository. Retrying sometimes works; the fixes below make it reliable.

## Fix 1: force HTTP/1.1

HTTP/2 stream resets from proxies, VPNs and some corporate firewalls are the most common cause of `curl 92`.

```bash
git config --global http.version HTTP/1.1
git clone https://github.com/org/big-repo.git
```

You can revert later with `git config --global --unset http.version`.

## Fix 2: shallow clone, then deepen

Downloading less in one go avoids long-running transfers that get cut:

```bash
git clone --depth 1 https://github.com/org/big-repo.git
cd big-repo
git fetch --unshallow          # or deepen gradually: git fetch --deepen=1000
```

If you only need the files, `--depth 1` alone is enough. Partial clone also helps for repos with big blobs:

```bash
git clone --filter=blob:none https://github.com/org/big-repo.git
```

## Fix 3: pushing large commits — postBuffer

When *pushing*, Git buffers the request body up to `http.postBuffer` (default 1 MiB); larger pushes use chunked transfer encoding, which some servers/proxies mishandle.

```bash
git config http.postBuffer 524288000    # 500 MB
git push
```

This doesn't help clones/fetches, and it's not a fix for files that exceed the host's size limit (GitHub rejects files over 100 MB — use Git LFS). Splitting a giant push into several smaller pushes also works:

```bash
git push origin HEAD~200:refs/heads/main   # push older commits first
git push origin main
```

## Fix 4: use SSH instead of HTTPS

SSH transport doesn't go through curl and is often more robust behind proxies:

```bash
git remote set-url origin git@github.com:org/big-repo.git
git fetch
```

(Requires an SSH key added to your account.)

## Fix 5: slow or unstable network

Tell curl not to abort slow transfers:

```bash
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
```

Also try another network, disable the VPN, or check whether a corporate proxy needs `http.proxy` configured.

## Fix 6: server-side limits

If it fails at the same point every time on a self-hosted GitLab/Gitea behind nginx, the reverse proxy may be timing out or limiting body size. Raise `client_max_body_size`, `proxy_read_timeout` and `proxy_send_timeout` on the server.

## Debugging

```bash
GIT_TRACE=1 GIT_CURL_VERBOSE=1 git clone <url> 2> trace.log
```

The log shows the HTTP version, proxy and where the connection broke.
