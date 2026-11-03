---
error: "Read-only file system"
error_full: |
  touch: cannot touch 'test.txt': Read-only file system
  cp: cannot create regular file '/etc/hosts': Read-only file system
  OSError: [Errno 30] Read-only file system: '/app/data'
cat: linux
description: The filesystem is mounted read-only — either deliberately (a read-only mount, container image, snap, ISO) or because the kernel remounted it after detecting disk errors. Check dmesg before simply remounting.
tldr: "Check the mount: `findmnt -no OPTIONS --target /path`. If the kernel remounted it due to errors (`dmesg | grep -i 'remount\\|error'`), back up, then run `fsck` from a rescue/unmounted state. If it's just mounted `ro`, remount: `sudo mount -o remount,rw /mountpoint`. In containers, write to a mounted volume or tmpfs instead."
keywords: linux read-only file system errno 30 erofs remount rw fsck dmesg ext4 errors=remount-ro docker readonly volume ntfs usb wsl
related: [linux-no-space-left-on-device, linux-permission-denied-running-script, docker-no-space-left-on-device]
---
## What it means

The write failed with `EROFS`: the filesystem itself is read-only, regardless of file permissions — even root can't write. Find which mount the path is on and its options:

```bash
findmnt --target /path/you/tried
mount | grep ' ro[ ,]'
```

The cause decides the fix. **Don't** just remount read-write before checking the kernel log.

## Cause 1: the kernel remounted it after disk errors

ext4 is usually mounted with `errors=remount-ro`: on a detected corruption or I/O error, the kernel flips it to read-only to prevent damage. Check:

```bash
sudo dmesg -T | grep -iE 'remount|EXT4-fs error|I/O error|xfs|btrfs'
sudo journalctl -k -b | grep -i error
```

Messages like `EXT4-fs error ... Remounting filesystem read-only` or `blk_update_request: I/O error` mean a filesystem or hardware problem.

What to do:

1. **Back up** anything important now (it's still readable).
2. Check the disk's health: `sudo smartctl -a /dev/sda` (package `smartmontools`).
3. Run a filesystem check while it's unmounted. For the root filesystem, reboot into recovery mode or a live USB:

```bash
sudo umount /dev/sdb1
sudo fsck -f /dev/sdb1          # ext4: e2fsck; xfs: xfs_repair; never fsck a mounted fs
```

For root on ext4 you can also schedule a check at boot by adding `fsck.mode=force` to the kernel command line once.

On VMs/cloud instances this often follows a storage hiccup (network disk timeout); a reboot plus fsck usually fixes it.

## Cause 2: mounted read-only on purpose

Check `/etc/fstab` for `ro`, or a recovery-mode boot (root is `ro` until remounted). Remount:

```bash
sudo mount -o remount,rw /
sudo mount -o remount,rw /mnt/data
```

Then fix `/etc/fstab` if it's set to `ro` there.

## Cause 3: NTFS / USB drives

- **Windows Fast Startup / hibernation:** Linux mounts the NTFS partition read-only because Windows left it "dirty". Fully shut down Windows (disable Fast Startup), or run `chkdsk /f` there. `ntfsfix /dev/sdX1` clears the flag as a last resort.
- **Write-protect switch** on SD cards/USB adapters.
- **ISO9660 / squashfs** (CD images, snaps under `/snap`) are always read-only by design.
- **exFAT/FAT errors:** `sudo fsck.vfat -a /dev/sdX1` or `sudo fsck.exfat /dev/sdX1`.

## Cause 4: containers

Docker with `--read-only`, Kubernetes with `readOnlyRootFilesystem: true`, and many serverless platforms (AWS Lambda — only `/tmp` is writable) make the root filesystem read-only. Write to a volume or tmpfs:

```bash
docker run --read-only --tmpfs /tmp -v appdata:/app/data myimage
```

```yaml
# Kubernetes
volumeMounts:
  - { name: tmp, mountPath: /tmp }
volumes:
  - { name: tmp, emptyDir: {} }
```

Bind mounts with `:ro` (`-v ./conf:/etc/app:ro`) are read-only too. Inside a container, `/proc/sys` and `/sys` are read-only — set sysctls with `docker run --sysctl` instead.

## Cause 5: system paths protected by design

- **macOS:** `/` and `/usr` (except `/usr/local`) are on a sealed read-only system volume. Use `/usr/local`, `/opt` or your home directory.
- **Immutable distros** (Fedora Silverblue, SteamOS, NixOS's `/nix/store`): `/usr` is read-only; install software via the distro's layering or Flatpak tools.
- **WSL:** `/mnt/c` paths are fine, but a broken WSL disk can go read-only; `wsl --shutdown` and retry, and check with `e2fsck` on the VHD if it persists.
