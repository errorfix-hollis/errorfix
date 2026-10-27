---
error: "Permission denied (publickey)"
error_full: |
  user@203.0.113.10: Permission denied (publickey).
cat: ssh
description: The server only accepts key authentication and rejected every key you offered. Check the key, the username, file permissions and authorized_keys.
tldr: "Connect with the right key and user: `ssh -i ~/.ssh/mykey user@host`. Debug with `ssh -v`. On the server, the public key must be in `~/.ssh/authorized_keys` with permissions 700 on `~/.ssh` and 600 on the file."
keywords: ssh permission denied publickey server ec2 authorized_keys pem key ubuntu user root login
related: [git-permission-denied-publickey, ssh-unprotected-private-key-file]
---
## What it means

The SSH server has password login disabled, and none of the keys your client sent match an entry in the target user's `~/.ssh/authorized_keys`.

## Step 1: see what's happening

```bash
ssh -v user@host
```

Look for `Offering public key:` lines (which keys were tried) and `Authentications that can continue: publickey`.

## Step 2: client-side checks

**Use the right username.** Cloud images use a default user, not root:

| Image | User |
|---|---|
| Ubuntu | `ubuntu` |
| Amazon Linux, RHEL | `ec2-user` |
| Debian | `admin` (AWS) or `debian` |
| Fedora / CentOS | `fedora` / `centos` |

**Use the right key:**

```bash
ssh -i ~/.ssh/mykey.pem ubuntu@host
```

**Fix key file permissions** (SSH ignores keys that others can read):

```bash
chmod 600 ~/.ssh/mykey.pem
```

**Too many keys in your agent.** The server may disconnect after a few failed keys. Force one key: `ssh -o IdentitiesOnly=yes -i ~/.ssh/mykey user@host`.

## Step 3: server-side checks (if you have console access)

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chown -R "$USER":"$USER" ~/.ssh
```

The home directory must not be writable by others either (`chmod go-w ~`).

Make sure the **public** key (the `.pub` line, starting with `ssh-ed25519` or `ssh-rsa`) is on a single line in `authorized_keys`. The easiest way to install it from the client is:

```bash
ssh-copy-id -i ~/.ssh/mykey.pub user@host
```

The server log says exactly why a key was refused:

```bash
sudo journalctl -u ssh -n 50      # or: sudo tail /var/log/auth.log
```

## Old RSA keys

OpenSSH 8.8+ disables `ssh-rsa` signatures with SHA-1. Old servers or old keys can then fail. Best fix: create an Ed25519 key (`ssh-keygen -t ed25519`). Temporary workaround for an old server: `ssh -o PubkeyAcceptedAlgorithms=+ssh-rsa -o HostkeyAlgorithms=+ssh-rsa user@host`.
