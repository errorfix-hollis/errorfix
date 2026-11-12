---
error: "Main process exited, code=exited, status=217/USER"
error_full: |
  myapp.service: Failed to determine user credentials: No such process
  myapp.service: Failed at step USER spawning /usr/bin/node: No such process
  myapp.service: Main process exited, code=exited, status=217/USER
  myapp.service: Failed with result 'exit-code'.
cat: linux
description: "systemd couldn't switch to the account in User= (or Group=) before starting the service, almost always because that user or group doesn't exist on this machine or the name is misspelled."
tldr: "Check the user exists: `id myuser` / `getent passwd myuser`. Create it (`sudo useradd --system --no-create-home --shell /usr/sbin/nologin myuser`) or fix `User=`/`Group=` in the unit, then `sudo systemctl daemon-reload && sudo systemctl restart myapp`. Alternatively use `DynamicUser=yes`."
keywords: systemd status=217/user failed at step user spawning failed to determine user credentials no such process user= group= service unit useradd dynamicuser 216/group
related: [linux-systemd-status-203-exec, linux-job-for-service-failed-because-the-control-process-exited-with-error-code, linux-start-request-repeated-too-quickly]
---
## What it means

Codes in the `2xx` range are systemd's own failures *before* your program runs. `217/USER` means the `USER` step failed: systemd tried to resolve the `User=` setting into a UID and couldn't. The sibling `216/GROUP` means the same for `Group=` or `SupplementaryGroups=`.

Your program never started, so its own logs are empty. Look at the unit log:

```bash
journalctl -u myapp -b --no-pager | tail -20
systemctl cat myapp | grep -Ei '^(User|Group|SupplementaryGroups|DynamicUser)='
```

## Cause 1: the user doesn't exist

The unit was copied from another server, a package's post-install script didn't run, or a deploy script forgot to create the account.

```bash
getent passwd myuser || echo "no such user"
```

Create a system user for the service:

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin myuser
```

If the app needs a home or data directory:

```bash
sudo useradd --system --home-dir /var/lib/myapp --create-home --shell /usr/sbin/nologin myuser
```

Then:

```bash
sudo systemctl restart myapp
```

## Cause 2: a typo or stray text in `User=`

Common mistakes: `www_data` instead of Debian/Ubuntu's `www-data`, `nginx` vs `www-data` across distros, or a trailing comment. systemd unit files have no inline comments:

```ini
# wrong: the user name becomes "deploy # app user"
User=deploy # app user
```

```ini
# right
# app user
User=deploy
```

Compare against the real name with `getent passwd | cut -d: -f1 | grep -i deploy`. After editing:

```bash
sudo systemctl daemon-reload
sudo systemctl restart myapp
```

## Cause 3: users from LDAP/SSSD/NIS that aren't available yet

If `myuser` comes from a directory service, it may not resolve early in boot. The service fails at boot but works when started manually. Order the unit after user lookups are available:

```ini
[Unit]
Wants=nss-user-lookup.target
After=nss-user-lookup.target network-online.target
```

For services that must always start, prefer a local system account.

## Cause 4: user services (`systemctl --user`)

In a **user** unit, `User=` is not supported (the manager already runs as you); remove it. Setting `User=` in `~/.config/systemd/user/*.service` to another account fails at the USER/GROUP step because an unprivileged manager can't switch users.

## Alternative: let systemd create the user

For services that don't need a persistent account, `DynamicUser=` allocates a transient UID at start:

```ini
[Service]
DynamicUser=yes
StateDirectory=myapp        # /var/lib/myapp, owned by the dynamic user
ExecStart=/usr/bin/myapp
```

This also implies a read-only filesystem except for `StateDirectory`, `CacheDirectory`, `LogsDirectory` and `RuntimeDirectory`, so check your app doesn't write elsewhere.

## Related exit codes

| Code | Step | Usual cause |
|---|---|---|
| `200/CHDIR` | WorkingDirectory | directory missing or not accessible to `User=` |
| `203/EXEC` | ExecStart | binary missing, not executable, wrong shebang ([details](/linux/linux-systemd-status-203-exec/)) |
| `216/GROUP` | Group | group doesn't exist |
| `217/USER` | User | user doesn't exist |
| `226/NAMESPACE` | sandboxing | `ReadWritePaths=`/`ProtectHome=` path missing |

Full list: `man systemd.exec`, section *Process Exit Codes*.
