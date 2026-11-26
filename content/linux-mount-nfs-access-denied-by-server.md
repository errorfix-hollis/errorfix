---
error: "mount.nfs: access denied by server while mounting"
error_full: |
  mount.nfs: access denied by server while mounting 192.168.1.10:/srv/share
  mount.nfs4: access denied by server while mounting nas:/volume1/data
cat: linux
description: "The NFS server rejected the mount request: the export doesn't exist at that path, your client's IP isn't allowed in /etc/exports, or (on NAS devices) the share's NFS permissions or NFSv4 pseudo-root path don't match what you asked for."
tldr: "On the server, check `/etc/exports` allows your client IP (e.g. `/srv/share 192.168.1.0/24(rw,sync,no_subtree_check)`), run `sudo exportfs -ra`, and confirm with `showmount -e SERVER` from the client. Mount the exact exported path; for NFSv4 with `fsid=0` mount relative to the root (`server:/share`), or force v3 with `-o vers=3`."
keywords: linux mount.nfs access denied by server while mounting nfs4 /etc/exports exportfs showmount client ip synology nas nfs permissions vers=3 fsid=0 insecure
related: [linux-mount-wrong-fs-type-bad-option-bad-superblock, linux-device-or-resource-busy, linux-permission-denied-running-script]
---
## What it means

The client reached the NFS server, but the server's `mountd` (v3) or export table (v4) refused the request. It's an export/permission decision on the **server**, not a file permission problem on the client. (If you get `wrong fs type` instead, the client is missing `nfs-common`/`nfs-utils`, see [mount wrong fs type](/linux/linux-mount-wrong-fs-type-bad-option-bad-superblock/).)

Start by asking the server what it exports and to whom:

```bash
showmount -e 192.168.1.10
# Export list for 192.168.1.10:
# /srv/share 192.168.1.0/24
```

`showmount` uses NFSv3's mountd; on NFSv4-only servers it may fail even when mounting works.

## Cause 1: client IP not allowed in /etc/exports

## Fix 1: allow your client and re-export

On the server:

```bash
sudo nano /etc/exports
```

```text
/srv/share  192.168.1.0/24(rw,sync,no_subtree_check)
```

Watch the syntax: **no space** between the client and the options. `/srv/share 192.168.1.0/24 (rw)` exports read-write to *everyone* and read-only to the subnet.

Apply and verify:

```bash
sudo exportfs -ra
sudo exportfs -v
```

Check which address the server sees from you. Behind NAT, a VPN or Docker, it may be a different IP than you expect; the server log (`journalctl -u nfs-server` or `/var/log/syslog`, `rpc.mountd: refused mount request from ...`) shows the source address. Hostnames in exports must resolve (forward and reverse) on the server; using IPs/subnets avoids that.

## Cause 2: wrong path

The path must match an export exactly (or be a subdirectory, with `no_subtree_check` exports). `server:/share` vs `server:/srv/share` is a common mismatch.

## Cause 3: NFSv4 pseudo-root (fsid=0)

If the server uses `fsid=0`, e.g.

```text
/srv/nfs        192.168.1.0/24(rw,fsid=0,no_subtree_check)
/srv/nfs/share  192.168.1.0/24(rw,no_subtree_check)
```

then NFSv4 clients mount paths **relative to** `/srv/nfs`:

```bash
sudo mount -t nfs4 192.168.1.10:/share /mnt/share
```

## Fix 3: or use NFSv3 explicitly

```bash
sudo mount -t nfs -o vers=3 192.168.1.10:/srv/share /mnt/share
```

If v3 works and v4 doesn't (or vice versa), the issue is version-specific path handling or the server only enabling one version.

## Cause 4: NAS share permissions (Synology, QNAP, TrueNAS)

Enabling NFS on the NAS isn't enough; each shared folder needs an NFS rule:

- **Synology**: Control Panel → Shared Folder → Edit → NFS Permissions → add the client IP/subnet. Mount path is `/volume1/<share>`.
- **TrueNAS**: Shares → NFS → add the network/hosts under the share.
- **QNAP**: Shared folder → Edit Shared Folder Permission → NFS host access.

## Cause 5: non-privileged source port

By default Linux servers require client requests from a port below 1024 (`secure`). macOS clients and some containers use higher ports and get denied. Either mount with `-o resvport` on macOS, or add `insecure` to the export options.

## Cause 6: Kerberos / sec mismatch

If the export uses `sec=krb5`, a client mounting with the default `sec=sys` is denied. Match the option: `-o sec=krb5`, with Kerberos configured on the client.
