---
error: "Job for X.service failed because the control process exited with error code"
error_full: |
  Job for nginx.service failed because the control process exited with error code.
  See "systemctl status nginx.service" and "journalctl -xeu nginx.service" for details.
cat: linux
description: systemd started the service, but its start command (ExecStart, or ExecStartPre) exited with a non-zero status. The message itself is generic; the real reason is in the service's logs.
tldr: "Run `systemctl status X.service` and `journalctl -xeu X.service --no-pager | tail -50` to see the real error. Common causes: bad config (test with `nginx -t`, `apachectl configtest`, `sshd -t`), port already in use, permissions, or a wrong ExecStart path. Fix it, then `sudo systemctl daemon-reload` (if you edited the unit) and `sudo systemctl restart X`."
keywords: linux systemd job for service failed because the control process exited with error code systemctl status journalctl -xeu nginx apache sshd mysql daemon-reload execstart status=1/failure 203/exec
related: [linux-unit-service-not-found, linux-address-already-in-use, web-nginx-bind-address-already-in-use]
---
## What it means

`systemctl start` (or `restart`, or `apt` starting a newly installed package) asked systemd to run the unit. The process systemd launched — the "control process" — exited with an error, so the job failed. systemd doesn't know *why*; the program printed its reason to its log. Your job is to find that line.

## Step 1: read the logs

```bash
systemctl status nginx.service --no-pager -l
journalctl -xeu nginx.service --no-pager | tail -50
```

In `status` look at the lines:

```text
Process: 1234 ExecStartPre=/usr/sbin/nginx -t -q -g daemon on; master_process on; (code=exited, status=1/FAILURE)
```

That tells you which command failed (`ExecStartPre` here — the config test) and the exit status. The journal lines just above it contain the program's own message, e.g. `nginx: [emerg] unknown directive "servr_name" in /etc/nginx/sites-enabled/default:3`.

If the journal is empty, run the `ExecStart` command by hand as the service user:

```bash
systemctl cat myapp.service          # see ExecStart, User, WorkingDirectory
sudo -u myapp /opt/myapp/bin/myapp --config /etc/myapp.yml
```

## Cause 1: configuration syntax error

The most common cause after editing a config file. Most daemons have a test mode:

```bash
sudo nginx -t
sudo apachectl configtest        # or: apache2ctl -t
sudo sshd -t
sudo named-checkconf
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
sudo php-fpm8.3 -t
sudo visudo -c
```

For YAML or JSON configs (netplan, `/etc/docker/daemon.json`, app configs) a single bad indent or trailing comma stops the service — check it with the [YAML validator](/tools/yaml-validator/) or [JSON formatter](/tools/json-formatter/).

## Cause 2: port already in use

Journal shows `bind() to 0.0.0.0:80 failed (98: Address already in use)` or similar:

```bash
sudo ss -ltnp | grep ':80 '
```

Stop the other program (often apache2 vs nginx, or an old instance not managed by systemd), or change the port. See [Address already in use](/linux/linux-address-already-in-use/).

## Cause 3: status=203/EXEC — the binary can't be executed

`(code=exited, status=203/EXEC)` means systemd couldn't run `ExecStart` at all: the path is wrong, it isn't executable, or a script lacks a shebang. `ExecStart` needs an absolute path:

```ini
[Service]
ExecStart=/usr/bin/node /opt/app/server.js
```

```bash
ls -l /opt/app/start.sh && sudo chmod +x /opt/app/start.sh
head -1 /opt/app/start.sh            # must be e.g. #!/bin/bash
```

Other numeric codes: `200/CHDIR` (WorkingDirectory missing), `217/USER` (User= doesn't exist), `226/NAMESPACE` (a path in ReadWritePaths= etc. doesn't exist).

## Cause 4: permissions

The service runs as a dedicated user (`User=` in the unit) that can't read its config, write its PID file, log directory or data directory:

```bash
sudo -u www-data test -r /etc/myapp/config.yml && echo ok
sudo chown -R mysql:mysql /var/lib/mysql
```

Also check SELinux/AppArmor denials: `sudo journalctl -k | grep -i -e denied -e apparmor` or `sudo ausearch -m avc -ts recent`.

## Cause 5: you edited the unit file but didn't reload

```bash
sudo systemctl daemon-reload
sudo systemctl restart myapp
```

Prefer overrides to editing vendor units: `sudo systemctl edit myapp` creates `/etc/systemd/system/myapp.service.d/override.conf`.

## Cause 6: Type= doesn't match how the program runs

If the program forks into the background but the unit says `Type=simple`, or vice versa with `Type=forking`, systemd may consider it failed or kill it. For most modern programs, run in the foreground and use `Type=simple` (or `exec`).

## Cause 7: start-limit-hit

After repeated failures: `Start request repeated too quickly`. Fix the underlying error, then:

```bash
sudo systemctl reset-failed myapp
sudo systemctl start myapp
```

## Useful afterwards

```bash
systemctl is-active myapp
journalctl -u myapp -f            # follow logs live
systemctl --failed                # list all failed units
```
