---
error: "sign_and_send_pubkey: no mutual signature supported"
error_full: |
  sign_and_send_pubkey: no mutual signature supported
  user@host: Permission denied (publickey).
cat: ssh
description: "Your OpenSSH client (8.8+) refuses to sign with the legacy ssh-rsa (SHA-1) algorithm, and the server only accepts that for RSA keys. The key itself is fine; the client and server share no signature algorithm."
tldr: "Best fix: use an ed25519 key (`ssh-keygen -t ed25519`) or update the server's OpenSSH. Quick workaround for one old host: add `PubkeyAcceptedAlgorithms +ssh-rsa` and `HostkeyAlgorithms +ssh-rsa` under `Host oldserver` in `~/.ssh/config`."
keywords: ssh sign_and_send_pubkey no mutual signature supported ssh-rsa sha1 rsa-sha2-256 PubkeyAcceptedAlgorithms PubkeyAcceptedKeyTypes openssh 8.8 permission denied publickey ed25519
related: [ssh-no-matching-host-key-type-found, ssh-permission-denied-publickey, ssh-load-key-invalid-format]
---
## What it means

An RSA key can be used with three signature algorithms: `ssh-rsa` (SHA-1), `rsa-sha2-256` and `rsa-sha2-512`. OpenSSH 8.8 (2021) disabled `ssh-rsa` by default because SHA-1 is broken. When the client connects to a server that only supports `ssh-rsa` signatures for user keys — typically OpenSSH older than 7.2, or old appliances, Gerrit/Bitbucket Server versions, embedded devices — there's no algorithm both sides accept, so the client skips the key and authentication falls through to `Permission denied (publickey)`.

The same happens in reverse with up-to-date servers and old clients, and on newer RHEL/Fedora systems where the crypto policy disables SHA-1.

Confirm with verbose output:

```bash
ssh -v user@host 2>&1 | grep -Ei "sign_and_send|server-sig-algs|Offering"
```

If the server's `server-sig-algs` list is missing or doesn't contain `rsa-sha2-256`, it's an old server.

## Fix 1: switch to an ed25519 key (best)

```bash
ssh-keygen -t ed25519 -C "you@example.com"
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host
```

Servers running OpenSSH 6.5+ support ed25519. If the server is too old for that too, see Fix 3.

## Fix 2: update the server

Upgrading OpenSSH on the server (7.2+) adds `rsa-sha2-256/512` support, so your existing RSA key works without weakening the client. For Git hosting software, upgrading usually fixes it (e.g. older Bitbucket Server, Gerrit, Azure DevOps Server versions).

## Fix 3: re-enable ssh-rsa for that host only

In `~/.ssh/config`:

```
Host oldserver
    HostName 192.0.2.10
    User admin
    PubkeyAcceptedAlgorithms +ssh-rsa
    HostkeyAlgorithms +ssh-rsa
```

On OpenSSH older than 8.5, the option is called `PubkeyAcceptedKeyTypes`. Keep it scoped to the `Host` block rather than `Host *`, so other connections stay on modern algorithms.

One-off on the command line:

```bash
ssh -o PubkeyAcceptedAlgorithms=+ssh-rsa -o HostkeyAlgorithms=+ssh-rsa user@host
```

For Git: `GIT_SSH_COMMAND="ssh -o PubkeyAcceptedAlgorithms=+ssh-rsa" git fetch`.

## Fix 4: RHEL / Fedora / CentOS Stream crypto policy

On RHEL 9 and Fedora 33+, the system-wide policy blocks SHA-1 signatures even with the config above. Options, from narrowest to broadest:

```bash
# per user: the ~/.ssh/config option above usually suffices; if not
sudo update-crypto-policies --set DEFAULT:SHA1   # system-wide, weaker
```

Prefer moving to ed25519 or ECDSA keys rather than lowering the policy.

## Fix 5: an old ssh-agent or key format

Very old agents (or some Windows agents like old Pageant) can't produce `rsa-sha2` signatures. Update the agent (PuTTY 0.75+), or bypass it with `ssh -o IdentitiesOnly=yes -i ~/.ssh/id_rsa user@host`. A key in an unexpected format may also fail to load; see [Load key: invalid format](/ssh/ssh-load-key-invalid-format/).
