---
error: "Host key verification failed."
error_full: |
  No ECDSA host key is known for github.com and you have requested strict checking.
  Host key verification failed.
  fatal: Could not read from remote repository.
cat: ssh
description: SSH couldn't confirm the server's identity — the host isn't in known_hosts and SSH can't ask you (non-interactive/CI or StrictHostKeyChecking=yes), or the stored key doesn't match.
tldr: "Add the host key to known_hosts after verifying its fingerprint: `ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts` (compare with the provider's published fingerprints). If the key changed legitimately, remove the old one: `ssh-keygen -R hostname`. In CI, write a pinned known_hosts instead of disabling checking."
keywords: ssh host key verification failed known_hosts ssh-keyscan ssh-keygen -R strict host key checking github gitlab ci jenkins docker git clone no ecdsa host key is known
related: [ssh-remote-host-identification-has-changed, git-could-not-read-from-remote-repository, ssh-permission-denied-publickey]
---
## What it means

On every connection SSH checks the server's host key against `~/.ssh/known_hosts` (and `/etc/ssh/ssh_known_hosts`). "Host key verification failed" happens before authentication, so it isn't about your private key. One of three things is true:

1. The host isn't known, and SSH can't prompt you (no TTY — CI, scripts, Docker builds, IDEs) or `StrictHostKeyChecking=yes` is set.
2. The host is known but its key **changed** — you'll also see the big `REMOTE HOST IDENTIFICATION HAS CHANGED!` warning.
3. known_hosts isn't readable, or you're running as a different user (e.g. `sudo`) whose known_hosts is empty.

## Fix 1: connect once interactively

On your own machine:

```bash
ssh -T git@github.com     # or: ssh user@server
```

Check the fingerprint shown against the provider's published value, then type `yes`. The key is saved to `~/.ssh/known_hosts`.

## Fix 2: add the key non-interactively (CI, scripts)

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keyscan -t ed25519,ecdsa,rsa github.com >> ~/.ssh/known_hosts
ssh-keygen -lf ~/.ssh/known_hosts      # print fingerprints to verify
```

`ssh-keyscan` trusts whatever answers on the network, so compare the fingerprints with the official ones (GitHub, GitLab and Bitbucket publish them in their docs) — or better, store a known-good known_hosts line as a CI secret/variable and write it out:

```yaml
# GitHub Actions / GitLab CI style
- run: |
    mkdir -p ~/.ssh
    echo "$SSH_KNOWN_HOSTS" >> ~/.ssh/known_hosts
    chmod 644 ~/.ssh/known_hosts
```

Non-standard port: `ssh-keyscan -p 2222 host` — the entry is stored as `[host]:2222`.

## Fix 3: the key changed legitimately

Server reinstalled, IP reused, or the provider rotated keys (GitHub replaced its RSA key in March 2023). Remove the stale entry and re-add:

```bash
ssh-keygen -R github.com
ssh-keygen -R 203.0.113.10          # also remove by IP if present
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
```

If you **didn't** expect a change, stop and confirm with the server's admin — this is exactly what a man-in-the-middle looks like.

## Fix 4: wrong user / wrong file

- `sudo git clone ...` uses root's `/root/.ssh/known_hosts`. Clone without sudo, or add the key for root too.
- Jenkins, GitLab Runner and systemd services run as their own user (e.g. `jenkins`); add the key in that user's home.
- Docker builds have no known_hosts. With BuildKit:

```dockerfile
RUN mkdir -p -m 0700 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts
RUN --mount=type=ssh git clone git@github.com:org/private.git
```

- Check permissions: `~/.ssh` should be `700` and owned by the user.

## Fix 5: use accept-new instead of disabling checks

OpenSSH 7.6+ supports accepting unknown hosts automatically while still rejecting *changed* keys:

```bash
ssh -o StrictHostKeyChecking=accept-new user@server
export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new"
```

Or per host in `~/.ssh/config`:

```
Host build-*.internal
    StrictHostKeyChecking accept-new
```

Avoid `StrictHostKeyChecking=no` with `UserKnownHostsFile=/dev/null` outside of throwaway test environments — it disables the protection completely.
