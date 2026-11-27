---
error: "Permission denied, please try again."
error_full: |
  user@192.168.1.10's password:
  Permission denied, please try again.
  user@192.168.1.10's password:
  user@192.168.1.10: Permission denied (publickey,password).
cat: ssh
description: "The SSH server rejected the password: wrong username or password, root login with a password is disabled (the default), the account is locked or not allowed by sshd_config, or password authentication is turned off."
tldr: "Check the username (`ssh user@host`, not your local name). For root, sshd's default `PermitRootLogin prohibit-password` rejects passwords: log in as a normal user and use `sudo`, or use a key. Look at the server log for the real reason: `sudo journalctl -u ssh -n 50` (or `/var/log/auth.log`, `/var/log/secure`)."
keywords: ssh permission denied please try again password authentication permitrootlogin prohibit-password sshd_config wrong password root login raspberry pi ubuntu passwordauthentication auth.log
related: [ssh-permission-denied-publickey, ssh-too-many-authentication-failures, ssh-connection-closed-by-remote-host]
---
## What it means

The connection worked and the server asked for a password, but authentication failed. The server deliberately gives the same message for "wrong password", "user doesn't exist" and "user not allowed", so the client can't tell the difference. The server's log can:

```bash
# On the server (console, or another session)
sudo journalctl -u ssh -u sshd -n 50 --no-pager
sudo tail -n 50 /var/log/auth.log      # Debian/Ubuntu
sudo tail -n 50 /var/log/secure        # RHEL/Fedora
```

Look for `Failed password for user`, `Failed password for invalid user`, `ROOT LOGIN REFUSED`, or `User x not allowed because ...`.

## Cause 1: wrong username

`ssh 192.168.1.10` uses your **local** username. Specify the remote one:

```bash
ssh pi@192.168.1.10
ssh ubuntu@ec2-host       # AWS Ubuntu images; Amazon Linux uses ec2-user
```

Also check `~/.ssh/config` for a `User` line for that host. Cloud images usually don't allow password login at all — use the key you selected when creating the instance: `ssh -i key.pem ubuntu@host`.

## Cause 2: logging in as root with a password

OpenSSH defaults to `PermitRootLogin prohibit-password`: root may log in with a key, never with a password. The password is "wrong" even if it's correct. Log in as a regular user and use `sudo -i`. If you must allow root logins, prefer adding a key to `/root/.ssh/authorized_keys` over enabling `PermitRootLogin yes`.

## Cause 3: the password really is wrong

- Keyboard layout differences (y/z, special characters) on the client.
- On a new Raspberry Pi OS image there's no default `pi/raspberry` anymore; the user is the one set in Raspberry Pi Imager.
- Reset it from a console: `sudo passwd username`.
- Check the account isn't locked or expired: `sudo passwd -S username`, `sudo chage -l username`. Unlock with `sudo passwd -u username`, or `sudo faillock --user username --reset` after too many failures (RHEL/Fedora).

## Cause 4: sshd restrictions

Check the effective configuration:

```bash
sudo sshd -T | grep -iE 'passwordauthentication|permitrootlogin|allowusers|allowgroups|denyusers|usepam'
```

- `allowusers` / `allowgroups` set but don't include you → rejected.
- Files in `/etc/ssh/sshd_config.d/` (e.g. `50-cloud-init.conf`) override the main file. Cloud images often set `PasswordAuthentication no` there; in that case the client typically shows only `Permission denied (publickey)`.

After editing, validate and reload:

```bash
sudo sshd -t && sudo systemctl reload ssh     # service is "sshd" on RHEL/Fedora/Arch
```

## Cause 5: Windows OpenSSH server

Use the right username form: a local account `user`, a Microsoft account email for MS-account logins (`ssh "you@outlook.com"@host`), or `domain\user` for domain accounts. Administrators' keys go in `C:\ProgramData\ssh\administrators_authorized_keys`, not in the user profile.

## Better: switch to key authentication

```bash
ssh-keygen -t ed25519
ssh-copy-id user@host
ssh user@host                 # no password prompt
```

Then you can set `PasswordAuthentication no` on the server.
