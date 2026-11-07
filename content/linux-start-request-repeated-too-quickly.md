---
error: "Start request repeated too quickly"
error_full: |
  myapp.service: Start request repeated too quickly.
  myapp.service: Failed with result 'exit-code'.
  Failed to start myapp.service - My App.
cat: linux
description: "systemd tried to restart a crashing service too many times within the rate-limit window (by default 5 starts in 10 seconds) and gave up. The real problem is why the service keeps exiting."
tldr: "Find the actual crash: `journalctl -u myapp -n 50 --no-pager`. Fix it (bad path, permissions, missing env, port in use), then `sudo systemctl reset-failed myapp && sudo systemctl start myapp`. To tune the limit, set `StartLimitIntervalSec=`/`StartLimitBurst=` in `[Unit]` and `RestartSec=5` in `[Service]`."
keywords: systemd start request repeated too quickly failed with result exit-code restart StartLimitBurst StartLimitIntervalSec RestartSec reset-failed journalctl service crash loop
related: [linux-job-for-service-failed-because-the-control-process-exited-with-error-code, linux-unit-service-not-found, linux-address-already-in-use]
---
## What it means

With `Restart=always` or `Restart=on-failure`, systemd restarts a service whenever it exits. To avoid a tight crash loop, each unit has a start rate limit: by default `StartLimitBurst=5` starts within `StartLimitIntervalSec=10s`. Once exceeded, systemd marks the unit failed and prints this message. It is a symptom; the service itself is crashing on every start.

## Step 1: find why it exits

```bash
systemctl status myapp
journalctl -u myapp -n 100 --no-pager
journalctl -u myapp -b -o cat | grep -iE "error|fail|denied" | tail
```

Look at the lines **before** "Start request repeated too quickly". The `status=` code helps: `203/EXEC` means `ExecStart` binary not found or not executable, `217/USER` means the `User=` doesn't exist, `200/CHDIR` a bad `WorkingDirectory=`, `226/NAMESPACE` a missing path in `ReadWritePaths=` and similar.

Run the exact `ExecStart` command by hand as the service user to see the error directly:

```bash
systemctl cat myapp | grep -E "ExecStart|User|WorkingDirectory|Environment"
sudo -u myuser /opt/myapp/bin/myapp --config /etc/myapp.yml
```

## Cause 1: common crash reasons

- **Path / executable**: use absolute paths in `ExecStart=`; scripts need a shebang and `chmod +x`. A script with Windows line endings fails with `203/EXEC` (check with the [line ending inspector](/tools/line-ending-whitespace-inspector/)).
- **Environment**: systemd doesn't load your shell profile. Set `Environment=KEY=value` or `EnvironmentFile=/etc/myapp.env`; node/python from nvm or a venv need full paths.
- **Port already in use**: another instance or process holds the port (`sudo ss -ltnp | grep :8080`).
- **Permissions**: the `User=` can't read config or write logs/data directories.
- **Config syntax errors** in the app's own config file.

## Cause 2: `Type=` doesn't match the program

If the program forks into the background (daemonizes) but the unit has `Type=simple`, systemd sees the main process exit and restarts it. Either run the program in foreground mode (preferred; e.g. `nginx -g 'daemon off;'`) or use `Type=forking` with `PIDFile=`. A one-shot script that exits normally should use `Type=oneshot` without `Restart=always`.

## Fix: restart after fixing

The failed state persists until reset:

```bash
sudo systemctl daemon-reload        # if you edited the unit
sudo systemctl reset-failed myapp
sudo systemctl start myapp
```

## Tune restart behaviour

For services that legitimately need time (e.g. waiting on a database), slow the restarts instead of removing the limit:

```bash
sudo systemctl edit myapp
```

```ini
[Unit]
StartLimitIntervalSec=300
StartLimitBurst=10

[Service]
Restart=on-failure
RestartSec=5
```

Note `StartLimitIntervalSec` and `StartLimitBurst` belong in `[Unit]` (older guides put `StartLimitInterval` in `[Service]`, which modern systemd ignores with a warning). `StartLimitIntervalSec=0` disables rate limiting entirely, which can leave a broken service spinning forever, so use it with a sensible `RestartSec`.

For dependency ordering problems, add `After=network-online.target postgresql.service` and `Wants=network-online.target`.
