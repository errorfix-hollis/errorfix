---
error: "Connection closed by remote host"
error_full: |
  Connection closed by 203.0.113.10 port 22
  ssh_exchange_identification: Connection closed by remote host
  Connection to 203.0.113.10 closed by remote host.
  client_loop: send disconnect: Broken pipe
cat: ssh
description: "The SSH server (or something in between) dropped the TCP connection. Before login it usually means sshd rejected you (MaxStartups, fail2ban, hosts.deny, crashed sshd); after login it usually means an idle timeout or the server rebooting."
tldr: "Run `ssh -vvv user@host` to see where it drops. Before authentication: check `sudo journalctl -u ssh -n 50` on the server, fail2ban bans (`sudo fail2ban-client status sshd`) and `MaxStartups`. During an idle session: add `ServerAliveInterval 60` to `~/.ssh/config`."
keywords: ssh connection closed by remote host ssh_exchange_identification connection closed by port 22 client_loop send disconnect broken pipe ServerAliveInterval fail2ban MaxStartups
related: [ssh-kex-exchange-identification-connection-closed, ssh-connection-timed-out, ssh-too-many-authentication-failures]
---
## What it means

The TCP connection was established, then the other side closed it. *When* it closes tells you the cause:

- **Immediately, before any key exchange** (`ssh_exchange_identification` / `kex_exchange_identification`) — sshd or a firewall refused the session.
- **After authentication** — the server ended the session: idle timeout, `sshd` restart, reboot, or a forced command exiting.
- **Mid-session after a while idle** (`Connection to host closed by remote host`, `Broken pipe`) — a NAT/firewall/load balancer dropped the idle connection.

Get details first:

```bash
ssh -vvv user@host
```

On the server (via console if needed):

```bash
sudo journalctl -u ssh -u sshd -n 100 --no-pager
sudo tail -n 50 /var/log/auth.log      # Debian/Ubuntu
```

## Cause 1: banned by fail2ban or similar

Several failed logins get your IP banned; the connection is then closed or reset immediately.

```bash
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd unbanip 198.51.100.7
```

Also check `/etc/hosts.deny` for `sshd: ALL` entries and cloud security groups.

## Cause 2: MaxStartups throttling

sshd drops new unauthenticated connections when too many are pending (default `MaxStartups 10:30:100`). Scanners and CI jobs opening many parallel connections hit this. The server log shows `drop connection #10 from ... past MaxStartups`. Raise it in `/etc/ssh/sshd_config`:

```
MaxStartups 30:30:100
```

```bash
sudo sshd -t && sudo systemctl restart ssh
```

## Cause 3: sshd is broken or misconfigured

A bad config or missing host keys make sshd's per-connection child exit at once. Test the config and keys:

```bash
sudo sshd -t
ls -l /etc/ssh/ssh_host_*
sudo ssh-keygen -A          # regenerate missing host keys
sudo systemctl restart ssh
```

## Cause 4: idle connection dropped

Home routers, corporate firewalls and cloud load balancers silently drop idle TCP flows (often after 5-15 minutes). Send keepalives from the client in `~/.ssh/config`:

```
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Or on the server, in `sshd_config`:

```
ClientAliveInterval 60
ClientAliveCountMax 3
```

For long-running jobs, use `tmux` or `screen` so the work survives a disconnect.

## Cause 5: the account can't get a session

Logins accepted then immediately closed usually mean the user's shell is invalid (`/usr/sbin/nologin`, deleted shell), a `ForceCommand`/`command=` in `authorized_keys` exits, or the account is expired. Check:

```bash
getent passwd username
sudo chage -l username
```

Git hosts behave like this on purpose: `ssh git@github.com` prints a greeting and closes.

## Cause 6: the server rebooted or ran out of resources

`Connection to host closed by remote host` with no other symptom can simply be a reboot or the OOM killer hitting sshd. Check `last reboot` and `journalctl -k | grep -i oom` on the server.
