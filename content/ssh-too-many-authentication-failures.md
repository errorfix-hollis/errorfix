---
error: "Received disconnect: Too many authentication failures"
error_full: |
  Received disconnect from 203.0.113.10 port 22:2: Too many authentication failures
  Disconnected from 203.0.113.10 port 22
cat: ssh
description: Your SSH client offered more keys than the server's MaxAuthTries allows (default 6) before reaching the right one or password auth. Usually ssh-agent holds many keys and tries them all.
tldr: "Tell ssh to use only one key: `ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 user@host`, or set `IdentitiesOnly yes` + `IdentityFile` for that host in `~/.ssh/config`. For password login: `ssh -o PubkeyAuthentication=no user@host`. Clear the agent with `ssh-add -D` if it has many keys."
keywords: ssh too many authentication failures received disconnect maxauthtries identitiesonly ssh-agent ssh-add -D identityfile ssh config pubkeyauthentication=no
related: [ssh-permission-denied-publickey, git-permission-denied-publickey, ssh-connection-timed-out]
---
## What it means

Each public key the client offers counts as one authentication attempt. The server's `MaxAuthTries` (default **6**) caps attempts per connection. If ssh-agent holds 6+ keys, or your config lists many `IdentityFile` entries, the client exhausts the limit before trying the right key or before asking for a password, and the server disconnects.

See what's being offered:

```bash
ssh -v user@host 2>&1 | grep -E "Offering|Authentications that can continue"
ssh-add -l          # keys loaded in the agent
```

## Fix 1: offer only the right key

On the command line:

```bash
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 user@host
```

`-i` alone is **not** enough: ssh still offers every other key in the agent as well, and each one counts as an attempt. `IdentitiesOnly=yes` restricts it to the identities you specify.

Permanently, in `~/.ssh/config`:

```
Host myserver
    HostName 203.0.113.10
    User deploy
    IdentityFile ~/.ssh/id_ed25519_myserver
    IdentitiesOnly yes
```

Then just `ssh myserver`. This is the cleanest fix if you have separate keys per server or per Git account.

For Git over SSH, use the same `Host` block (e.g. `Host github-work` with `HostName github.com`), or:

```bash
GIT_SSH_COMMAND="ssh -o IdentitiesOnly=yes -i ~/.ssh/work_key" git pull
```

## Fix 2: password login is blocked by keys

If the server uses passwords and you have keys loaded, the keys use up the attempts. Skip keys:

```bash
ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password user@host
```

## Fix 3: clean up ssh-agent

Remove all keys from the agent, then add only what you need:

```bash
ssh-add -D
ssh-add ~/.ssh/id_ed25519
```

Desktop keyrings (GNOME Keyring, macOS Keychain) may re-add keys automatically at login. On macOS, `UseKeychain yes` / `AddKeysToAgent yes` in `~/.ssh/config` loads keys as you use them; review which keys end up there.

Avoid `Host *` blocks with many `IdentityFile` lines — they apply to every connection.

## Fix 4: raise MaxAuthTries on the server

If you control the server and genuinely need more attempts, edit `/etc/ssh/sshd_config` (or a file in `/etc/ssh/sshd_config.d/`):

```
MaxAuthTries 10
```

```bash
sudo sshd -t && sudo systemctl reload ssh     # 'sshd' on RHEL/Fedora/Arch
```

Keep it reasonably low: it limits brute-force attempts per connection. Fixing the client is preferred.

## Fix 5: fail2ban or similar locked you out

If repeated failures triggered fail2ban, later connections may hang or be refused entirely (`Connection refused` / timeout) rather than showing this message. From another IP or the console:

```bash
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd unbanip 198.51.100.7
```
