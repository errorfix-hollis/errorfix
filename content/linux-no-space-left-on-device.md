---
error: "No space left on device"
error_full: "write error: No space left on device"
cat: linux
description: A filesystem is full — or it has run out of inodes. Find what's using space with df and du, then clean logs, caches and old files.
tldr: "Run `df -h` to find the full filesystem and `df -i` to check inodes. Then find big folders with `sudo du -xh / --max-depth=2 | sort -h | tail -20` and clean up (journal: `sudo journalctl --vacuum-size=200M`)."
keywords: no space left on device linux disk full df du inodes journal logs apt cache deleted files
related: [docker-no-space-left-on-device]
---
## What it means

The kernel couldn't write because the filesystem has no free blocks, or no free **inodes** (one is needed per file).

## Step 1: which filesystem is full?

```bash
df -h       # space
df -i       # inodes
```

## Step 2: find what's big

```bash
sudo du -xh / --max-depth=2 2>/dev/null | sort -h | tail -20
```

Then drill into the biggest folder. `ncdu` (`sudo apt install ncdu`) does the same interactively.

## Usual suspects and safe cleanups

| Where | Clean with |
|---|---|
| systemd journal (`/var/log/journal`) | `sudo journalctl --vacuum-size=200M` |
| old logs (`/var/log/*.gz`, `*.1`) | `sudo find /var/log -name "*.gz" -delete` |
| apt cache | `sudo apt clean` and `sudo apt autoremove --purge` |
| snap old revisions | `sudo snap set system refresh.retain=2` |
| Docker | `docker system prune -a` (see the Docker page) |
| your caches (`~/.cache`, pip, npm) | `rm -rf ~/.cache/pip`, `npm cache clean --force` |

## df says full, du can't find it

A deleted file that a process still has open keeps using space until the process exits:

```bash
sudo lsof +L1 | sort -k7 -n | tail
```

Restart the process holding it (often a log writer). Truncating instead of deleting avoids this in the future: `: > big.log`.

Space can also hide under a mount point (files written to `/mnt/data` before the disk was mounted there).

## Out of inodes

`df -i` at 100% means too many small files. Find folders with the most files:

```bash
sudo find / -xdev -type f | cut -d/ -f2-3 | sort | uniq -c | sort -n | tail
```

Typical culprits: PHP session files, mail queues, cache folders, `node_modules` copies.

## Reserved blocks

ext4 reserves 5% for root by default, so normal users can hit "full" earlier. On large data disks you can lower it: `sudo tune2fs -m 1 /dev/sdX1`.
