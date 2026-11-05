---
error: "fatal: the remote end hung up unexpectedly"
error_full: |
  error: RPC failed; HTTP 400 curl 22 The requested URL returned error: 400
  send-pack: unexpected disconnect while reading sideband packet
  fatal: the remote end hung up unexpectedly
  Everything up-to-date
cat: git
description: The connection to the Git server closed in the middle of a push, pull or clone. Usually the push is too large for the HTTP buffer or the host's size limit, the network is unstable, or the server rejected the request.
tldr: "Read the line above it. For big HTTPS pushes run `git config http.postBuffer 524288000` and retry, or push in smaller chunks. For files over the host limit (100 MB on GitHub), remove them from history or use Git LFS. For flaky networks, use SSH instead of HTTPS, or clone shallow with `git clone --depth 1`."
keywords: git fatal the remote end hung up unexpectedly push large repo http.postbuffer rpc failed send-pack unexpected disconnect sideband github gitlab ssh clone
related: [git-rpc-failed-curl-92-early-eof, git-gh001-large-files-detected, git-failed-to-push-some-refs]
---
## What it means

Git was exchanging pack data with the server and the other side closed the connection. The message itself is generic: the real cause is usually in the lines just before it (`RPC failed; HTTP 413`, `curl 55`, `pack exceeds maximum allowed size`, `Connection reset by peer`).

Get more detail:

```bash
GIT_TRACE=1 GIT_CURL_VERBOSE=1 git push 2>&1 | tail -40     # HTTPS
GIT_SSH_COMMAND="ssh -v" git push                          # SSH
```

## Cause 1: the push is too big for Git's HTTP buffer

With `RPC failed; HTTP 400` or `curl 22`, Git's default post buffer (1 MiB) caused a chunked upload some proxies/servers reject. Raise it:

```bash
git config http.postBuffer 524288000   # 500 MB, for this repo
git push
```

Only raise it as much as needed; it allocates that much memory for large pushes.

## Cause 2: the push exceeds the host's limits

GitHub rejects files over 100 MB and pushes over 2 GB; GitLab and Bitbucket have their own limits, and a reverse proxy may return `HTTP 413`. Find large files:

```bash
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
  | awk '$1=="blob" && $3 > 50000000 {print $3, $4}' | sort -n
```

Remove them from history (`git filter-repo --path big.zip --invert-paths`) or track them with Git LFS. See [GH001: Large files detected](/git/git-gh001-large-files-detected/).

For a huge first push, push history in pieces:

```bash
git push origin HEAD~500:refs/heads/main
git push origin HEAD~250:refs/heads/main
git push origin HEAD:main
```

If your own nginx sits in front of the Git server, raise `client_max_body_size` (see [413 Request Entity Too Large](/web/web-nginx-413-request-entity-too-large/)).

## Cause 3: unstable network or a proxy/VPN cutting long transfers

Retry on a stable connection, or switch to SSH, which is often more robust than HTTPS through corporate proxies:

```bash
git remote set-url origin git@github.com:user/repo.git
```

Keep idle SSH connections alive in `~/.ssh/config`:

```
Host github.com
  ServerAliveInterval 30
  ServerAliveCountMax 10
```

## Cause 4: cloning a very large repository

Clone less data, then fetch the rest:

```bash
git clone --depth 1 https://github.com/user/repo.git
cd repo
git fetch --unshallow        # optional, later
```

Or `git clone --filter=blob:none` (partial clone) to download file contents on demand.

## Cause 5: authentication or permission failure over SSH

If `ssh -v` shows the connection closing right after authentication, the key has no access to the repo or the server rejected it. Test with `ssh -T git@github.com`, and see [Permission denied (publickey)](/git/git-permission-denied-publickey/).

## Cause 6: server-side hook or repository problem

A pre-receive hook that crashes, a full disk, or a corrupted repo on a self-hosted server can close the connection. Check the server logs (`/var/log/gitlab/`, Gitea logs) and run `git fsck` on the server-side repository.
