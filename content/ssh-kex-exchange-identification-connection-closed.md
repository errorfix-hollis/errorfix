---
error: "kex_exchange_identification: Connection closed by remote host"
error_full: |
  kex_exchange_identification: Connection closed by remote host
  Connection closed by 203.0.113.10 port 22
  kex_exchange_identification: read: Connection reset by peer
cat: ssh
description: The TCP connection opened, but the server closed it before even sending its SSH banner. Typical causes are sshd rate limiting (MaxStartups), fail2ban/firewall blocks, TCP wrappers, a broken sshd, or a proxy/VPN that isn't really SSH on that port.
tldr: "Run `ssh -vvv user@host` and check on the server: `sudo journalctl -u ssh -n 50` (or `sshd`). If you're banned, unban with `sudo fail2ban-client set sshd unbanip <your-ip>`. Check `/etc/hosts.deny`, `MaxStartups` in `/etc/ssh/sshd_config`, and validate the config with `sudo sshd -t`. For GitHub, try `ssh -T -p 443 git@ssh.github.com`."
keywords: ssh kex_exchange_identification connection closed by remote host connection reset by peer port 22 sshd maxstartups fail2ban hosts.deny github port 443 banner exchange
related: [ssh-connection-timed-out, ssh-too-many-authentication-failures, ssh-permission-denied-publickey]
---
## What it means

The SSH handshake starts with each side sending a version banner (`SSH-2.0-OpenSSH_9.6`). Your client connected but the server closed (or reset) the connection before its banner arrived. That rules out "host down" and "port closed" (those give timeouts or `Connection refused`): something on or in front of the server is accepting and immediately dropping you.

Get details:

```bash
ssh -vvv user@host
nc -v host 22          # a healthy server prints SSH-2.0-... straight away
```

If `nc` shows no banner and closes, the problem is server- or network-side. On the server (via console if needed):

```bash
sudo journalctl -u ssh -u sshd -n 50 --no-pager
sudo sshd -t           # config syntax check
```

## Cause 1: fail2ban, sshguard or a firewall banned your IP

Repeated failed logins get an IP blocked, and some setups reject rather than drop. On the server:

```bash
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd unbanip 198.51.100.7
```

Add your IP to `ignoreip` in `/etc/fail2ban/jail.local` if you get banned often, and fix whatever caused the failures (often a client offering many keys — see [Too many authentication failures](/ssh/ssh-too-many-authentication-failures/)).

## Cause 2: MaxStartups — too many unauthenticated connections

sshd drops new connections when too many are still in the auth phase (default `MaxStartups 10:30:100`: start randomly dropping at 10). Brute-force bots or parallel automation (Ansible forks, CI jobs) trigger it. The log shows `drop connection #10 from ... past MaxStartups`.

In `/etc/ssh/sshd_config`:

```
MaxStartups 30:30:100
LoginGraceTime 30
```

```bash
sudo sshd -t && sudo systemctl reload ssh     # service is "sshd" on RHEL/Fedora/Arch
```

Better long-term: restrict port 22 to known IPs, or use fail2ban to cut bot traffic.

## Cause 3: TCP wrappers (/etc/hosts.deny)

On systems still using libwrap, a line like `sshd: ALL` in `/etc/hosts.deny` closes connections instantly. Check `/etc/hosts.allow` and `/etc/hosts.deny`.

## Cause 4: sshd is broken

If sshd can't load its host keys or config, it may accept and immediately close. Signs in the log: `no hostkeys available`, `Missing privilege separation directory: /run/sshd`, permission errors on `/etc/ssh/ssh_host_*_key`.

```bash
sudo ssh-keygen -A                     # regenerate missing host keys
sudo mkdir -p /run/sshd
sudo chmod 600 /etc/ssh/ssh_host_*_key
sudo sshd -t && sudo systemctl restart ssh
```

Full disk can cause the same — check `df -h`.

## Cause 5: something else is on that port, or a proxy/VPN interferes

A load balancer, port forward or Docker container may be listening on port 22 but forwarding to nothing. Corporate proxies and some VPNs also reset SSH. Test from another network, and check what's listening on the server: `sudo ss -tlnp | grep :22`.

For GitHub/GitLab blocked on port 22, use their SSH-over-443 endpoints in `~/.ssh/config`:

```
Host github.com
  HostName ssh.github.com
  Port 443
  User git
```

Then `ssh -T git@github.com`. GitLab.com uses `altssh.gitlab.com` port 443.

## Cause 6: wrong port or server is still booting

Right after a reboot, cloud VMs may accept TCP before sshd is ready. Wait a minute and retry. If sshd listens on a custom port, connect with `ssh -p 2222 user@host`.
