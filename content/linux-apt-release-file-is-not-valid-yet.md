---
error: "Release file is not valid yet"
error_full: |
  E: Release file for http://archive.ubuntu.com/ubuntu/dists/jammy-updates/InRelease is not valid yet (invalid for another 5h 12min 3s). Updates for this repository will not be applied.
cat: linux
description: "The repository's Release file is dated in the future relative to your system clock. Your clock is behind — common in fresh VMs, Raspberry Pis without an RTC, WSL after sleep, and Docker builds on hosts with a wrong clock."
tldr: "Fix the clock: `sudo timedatectl set-ntp true` (or `sudo hwclock --hctosys`, or on WSL `wsl --shutdown`), check with `date`, then `sudo apt update`. As a one-off workaround: `sudo apt -o Acquire::Check-Valid-Until=false -o Acquire::Check-Date=false update`."
keywords: apt release file is not valid yet invalid for another updates for this repository will not be applied ubuntu debian clock time timedatectl ntp wsl docker raspberry pi check-date
related: [linux-apt-hash-sum-mismatch, linux-apt-no-pubkey, linux-e-unable-to-locate-package]
---
## What it means

Each repository's `InRelease`/`Release` file has a `Date:` field. APT refuses files dated after the current system time, because a future date usually means the clock is wrong (and a wrong clock also breaks TLS and signature validity checks). The `invalid for another 5h 12min` part tells you roughly how far behind your clock is.

Check:

```bash
date
timedatectl
```

If the shown time is wrong (or the timezone is wrong *and* the hardware clock is set as local time), that's the cause.

## Fix 1: sync the clock with NTP (systemd systems)

```bash
sudo timedatectl set-ntp true
timedatectl status        # look for "System clock synchronized: yes"
sudo apt update
```

If sync doesn't happen, the NTP service may be missing or UDP 123 is blocked:

```bash
sudo apt install systemd-timesyncd     # if missing; may need Fix 3 first
sudo systemctl restart systemd-timesyncd
journalctl -u systemd-timesyncd -n 20
```

Or set the time manually as a stopgap:

```bash
sudo date -s "2026-11-19 12:00:00"
```

## Fix 2: WSL 2 clock drift

WSL 2's clock can fall behind after the Windows host sleeps. From PowerShell:

```powershell
wsl --shutdown
```

Reopen the distro and check `date`. Alternatively, inside WSL: `sudo hwclock -s`.

## Fix 3: one-off update ignoring the date check

If you can't fix the clock right now (e.g. a locked-down container):

```bash
sudo apt -o Acquire::Check-Valid-Until=false -o Acquire::Check-Date=false update
```

`Check-Date=false` is the option that covers "not valid yet"; `Check-Valid-Until=false` covers the opposite, expired Release files (common with snapshot/archive mirrors). This weakens replay protection, so don't make it permanent.

## Fix 4: Docker builds

Containers use the **host's** kernel clock; you can't fix it inside the container. On Docker Desktop (macOS/Windows), the VM clock drifts after sleep — restart Docker Desktop. On Linux hosts, fix the host clock with Fix 1. If you must, add the options in the Dockerfile temporarily:

```dockerfile
RUN apt-get -o Acquire::Check-Date=false update && apt-get install -y curl
```

## Fix 5: Raspberry Pi and boards without an RTC

Boards without a battery-backed clock boot with an old time until NTP syncs. Make sure networking comes up and timesyncd runs; `fake-hwclock` (installed on Raspberry Pi OS) saves the last known time on shutdown so the clock is at least close on boot.

## Fix 6: dual-boot with Windows

Windows stores local time in the hardware clock; Linux expects UTC. After booting Windows, Linux can be hours off. Either let NTP correct it, or tell Linux to use local time for the RTC:

```bash
timedatectl set-local-rtc 1 --adjust-system-clock
```

(Windows can also be switched to UTC with the `RealTimeIsUniversal` registry value.)
