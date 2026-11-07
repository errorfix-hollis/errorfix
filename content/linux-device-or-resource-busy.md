---
error: "umount: target is busy / Device or resource busy"
error_full: |
  umount: /mnt/data: target is busy.
  rm: cannot remove '/mnt/data': Device or resource busy
  mount: /mnt/usb: /dev/sdb1 already mounted or mount point busy.
cat: linux
description: "The kernel refuses because something is still using the filesystem or device: a process has a file open, its current directory is inside the mount, another mount sits on top, or the device is held by LVM/RAID/swap."
tldr: "Find the user: `sudo fuser -vm /mnt/data` or `sudo lsof +f -- /mnt/data`, then `cd` out of it and stop or kill those processes, and run `sudo umount /mnt/data`. Last resort: `sudo umount -l /mnt/data` (lazy detach). For `rm` errors, the path is a mount point: unmount it first."
keywords: linux umount target is busy device or resource busy ebusy fuser lsof lazy unmount umount -l mount point busy rm cannot remove nfs docker overlay swapoff
related: [linux-read-only-file-system, linux-text-file-busy, linux-no-space-left-on-device]
---
## What it means

`EBUSY` means the kernel can't complete the operation while something else holds a reference. For `umount`, any open file, current working directory, memory-mapped file, nested mount, loop device or swap file on that filesystem keeps it busy.

## Fix 1: find and stop what's using it

```bash
sudo fuser -vm /mnt/data          # -m: everything on that filesystem
sudo lsof +f -- /mnt/data         # open files on the filesystem
```

`fuser` shows the access type: `c` = current directory, `f` = open file, `m` = mmap, `e` = running executable.

The usual culprit is your own shell:

```bash
pwd          # inside /mnt/data? then:
cd ~
sudo umount /mnt/data
```

Stop services cleanly (`sudo systemctl stop myapp`) rather than killing them. To kill all processes using the mount (careful):

```bash
sudo fuser -km /mnt/data
```

## Fix 2: nested mounts

If something is mounted *under* the target, unmount that first, or unmount the whole tree:

```bash
findmnt -R /mnt/data
sudo umount -R /mnt/data
```

Bind mounts, chroots (`/mnt/chroot/proc`, `/dev`, `/sys`) and Docker volumes often leave nested mounts behind.

## Fix 3: swap, loop devices, LVM, RAID

- Swap file on the filesystem: `sudo swapoff /mnt/data/swapfile`.
- Loop devices backed by files there: `losetup -a`, then `sudo losetup -d /dev/loop0`.
- Wiping or repartitioning a disk fails with "Device or resource busy" when it holds an active LVM volume group or RAID array: `sudo vgchange -an <vg>` or `sudo mdadm --stop /dev/md0`. `lsblk` shows what sits on the device.

## Fix 4: lazy unmount (last resort)

```bash
sudo umount -l /mnt/data
```

This detaches the mount point immediately and finishes cleanup when the last user closes it. Processes still using it keep working on the old filesystem, so don't unplug the device until they are gone. For a dead NFS server, use `sudo umount -f -l /mnt/nfs`.

## Fix 5: `rm: cannot remove ... Device or resource busy`

The directory is a mount point (often inside Docker containers: `/etc/hosts`, `/etc/resolv.conf` and volume paths are bind mounts). Check with `findmnt /path` or `mountpoint /path`. Unmount it first on the host; inside a container, change the volume configuration instead of deleting the file.

## Fix 6: `mount: ... already mounted or mount point busy`

The device is already mounted somewhere else or used by something (swap, RAID, LVM, or an automounter):

```bash
findmnt /dev/sdb1
lsblk -f /dev/sdb
```

Unmount it from the other location first, or mount the right partition (`/dev/sdb1` vs `/dev/sdb`).

## Desktop file managers and indexers

GNOME/KDE file managers, `tracker-miner`, `baloo`, antivirus and backup tools often have files open on USB drives. Close windows showing the drive, or eject from the file manager, which handles this for you.
