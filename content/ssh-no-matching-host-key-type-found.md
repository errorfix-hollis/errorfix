---
error: "no matching host key type found. Their offer: ssh-rsa"
error_full: |
  Unable to negotiate with 192.168.1.10 port 22: no matching host key type found. Their offer: ssh-rsa,ssh-dss
cat: ssh
description: OpenSSH 8.8+ disables the old SHA-1 `ssh-rsa` signature algorithm, and the server (old router, NAS, legacy Linux, old Gerrit/Bitbucket) only offers that. Enable it just for that host, or upgrade the server's SSH.
tldr: "Allow it for that host only: `ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa user@host`, or permanently in `~/.ssh/config` under `Host oldbox`. Better: upgrade the server's OpenSSH and give it an ed25519 host key."
keywords: ssh unable to negotiate no matching host key type found their offer ssh-rsa ssh-dss openssh 8.8 HostKeyAlgorithms PubkeyAcceptedAlgorithms PubkeyAcceptedKeyTypes sha1 legacy router
related: [ssh-permission-denied-publickey, ssh-host-key-verification-failed, ssh-connection-timed-out]
---
## What it means

During connection setup the client and server must agree on a host key algorithm. Since OpenSSH 8.8 (2021), the client no longer accepts `ssh-rsa` — RSA signatures with SHA-1, which is considered broken. The newer `rsa-sha2-256` / `rsa-sha2-512` algorithms use the *same RSA key* with SHA-2, but very old servers (OpenSSH < 7.2, Dropbear on routers, old switches, some embedded devices) only know `ssh-rsa`. `ssh-dss` (DSA) has been disabled even longer.

"Their offer" lists what the server supports. If nothing in it is enabled on your side, negotiation fails.

## Fix 1: allow ssh-rsa for one connection

```bash
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa user@192.168.1.10
```

- `HostKeyAlgorithms` – lets you accept the server's ssh-rsa host key (fixes this error).
- `PubkeyAcceptedAlgorithms` – lets you authenticate with your RSA key using SHA-1 signatures. Without it you may get past this error and then hit `Permission denied (publickey)`.

On OpenSSH older than 8.5 the second option is called `PubkeyAcceptedKeyTypes`.

## Fix 2: make it permanent for that host only

```sshconfig
# ~/.ssh/config
Host oldrouter
    HostName 192.168.1.10
    User admin
    HostKeyAlgorithms +ssh-rsa
    PubkeyAcceptedAlgorithms +ssh-rsa
```

Then `ssh oldrouter`. Don't put this under `Host *`; keep the weakened setting limited to the legacy device.

For Git remotes on an old server, the same `Host` block works with the Git host name, or set it per command:

```bash
GIT_SSH_COMMAND="ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa" git pull
```

## Related: no matching key exchange method / cipher

Very old servers often fail at other steps too:

```text
Unable to negotiate ... no matching key exchange method found. Their offer: diffie-hellman-group1-sha1
Unable to negotiate ... no matching cipher found. Their offer: aes128-cbc,3des-cbc
```

Enable those the same way, only for that host:

```bash
ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc user@host
```

## Fix 3: upgrade the server (proper fix)

If you control the server, update OpenSSH (7.2+ supports `rsa-sha2-*`) and add a modern host key:

```bash
sudo ssh-keygen -t ed25519 -f /etc/ssh/ssh_host_ed25519_key -N ''
# ensure sshd_config contains:  HostKey /etc/ssh/ssh_host_ed25519_key
sudo systemctl restart ssh        # or sshd
```

For network devices, check for a firmware update that brings a newer SSH stack.

## Client side: switch your own key to ed25519

If the server is modern but rejects your old RSA key setup, generate a new key and install it:

```bash
ssh-keygen -t ed25519 -C "me@laptop"
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host
```

## Check what your client supports

```bash
ssh -Q HostKeyAlgorithms
ssh -Q PubkeyAcceptedAlgorithms
ssh -vvv user@host 2>&1 | grep -i 'host key algorithms'
```

## RHEL / Fedora crypto policies

On RHEL 9 and Fedora, the system-wide crypto policy also blocks SHA-1. Per-host options may not be enough; for a temporary workaround use `sudo update-crypto-policies --set DEFAULT:SHA1` (and revert later), or `LEGACY` as a last resort.
