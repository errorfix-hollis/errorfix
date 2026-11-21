---
error: "mount: wrong fs type, bad option, bad superblock"
error_full: |
  mount: /mnt/data: wrong fs type, bad option, bad superblock on /dev/sdb1, missing codepage or helper program, or other error.
         dmesg(1) may have more information after failed mount system call.
cat: linux
description: "mount could not mount the device: the filesystem type is unsupported or wrong, a helper package (for NFS, CIFS, exFAT, NTFS) is missing, an option is invalid, or the filesystem is damaged."
tldr: "Run `sudo dmesg | tail` and `lsblk -f` to see the real reason and filesystem type. Install the helper: `sudo apt install nfs-common` (NFS), `cifs-utils` (SMB), `exfatprogs`/`ntfs-3g`. Mount the partition (`/dev/sdb1`), not the disk (`/dev/sdb`). For corruption, run `sudo fsck -f /dev/sdb1` while unmounted."
keywords: linux mount wrong fs type bad option bad superblock missing codepage or helper program nfs-common cifs-utils mount.nfs mount.cifs ntfs exfat fsck dmesg lsblk fstab
related: [linux-device-or-resource-busy, linux-read-only-file-system, linux-no-space-left-on-device]
---
## What it means

The kernel's `mount()` call failed with `EINVAL`, and `mount` prints this generic message listing every possible cause. The real reason is in the kernel log:

```bash
sudo dmesg | tail -20
lsblk -f               # shows FSTYPE for every partition
sudo blkid /dev/sdb1
```

## Cause 1: NFS or SMB/CIFS helper not installed

Network filesystems need user-space helpers (`/sbin/mount.nfs`, `/sbin/mount.cifs`). Without them you get exactly this error.

```bash
# Debian/Ubuntu
sudo apt install nfs-common      # NFS
sudo apt install cifs-utils      # SMB / Windows shares
# RHEL/Fedora
sudo dnf install nfs-utils cifs-utils
```

Then:

```bash
sudo mount -t nfs server:/export /mnt/data
sudo mount -t cifs //server/share /mnt/share -o username=me,uid=$(id -u),gid=$(id -g)
```

## Cause 2: mounting the whole disk instead of the partition

`/dev/sdb` is the disk; the filesystem is usually on `/dev/sdb1`. Same for `/dev/nvme0n1` vs `/dev/nvme0n1p1`.

```bash
lsblk
sudo mount /dev/sdb1 /mnt/data
```

If `lsblk -f` shows no FSTYPE at all, the partition is unformatted (format it only if it's new and empty: `sudo mkfs.ext4 /dev/sdb1`).

## Cause 3: wrong or unsupported filesystem type

Passing `-t ext4` for an XFS, NTFS or exFAT volume fails. Let mount detect it, or use the type from `lsblk -f`. Install support for Windows/USB filesystems:

```bash
sudo apt install exfatprogs ntfs-3g
sudo mount -t ntfs3 /dev/sdb1 /mnt/win     # kernel 5.15+ driver, or -t ntfs-3g
```

An NTFS volume from a Windows machine with Fast Startup/hibernation enabled may refuse to mount; shut Windows down fully (or disable Fast Startup).

## Cause 4: invalid mount option

An option valid for one filesystem is rejected by another, e.g. `uid=`/`gid=` work for vfat/ntfs/cifs but not ext4, and a typo in `/etc/fstab` breaks the entry. `dmesg` usually names it (`ext4: Unrecognized mount option "uid=1000"`). Test fstab changes safely:

```bash
sudo findmnt --verify
sudo mount -a
```

## Cause 5: corrupted filesystem or bad superblock

`dmesg` shows things like `bad geometry` or `VFS: Can't find ext4 filesystem`. With the device **unmounted**:

```bash
sudo fsck -f /dev/sdb1            # ext2/3/4
sudo xfs_repair /dev/sdb1         # XFS
```

For ext4 with a damaged primary superblock, list backups and use one:

```bash
sudo mke2fs -n /dev/sdb1          # -n = dry run, only prints backup locations
sudo e2fsck -b 32768 /dev/sdb1
```

Back up important data (e.g. `ddrescue`) before repairing a failing disk.

## Cause 6: loop devices and images

For ISO or disk images use a loop mount, and for whole-disk images pick the partition:

```bash
sudo mount -o loop image.iso /mnt/iso
sudo losetup -fP --show disk.img   # creates /dev/loop0p1 ...
sudo mount /dev/loop0p1 /mnt/img
```
