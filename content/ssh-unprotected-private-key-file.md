---
error: "WARNING: UNPROTECTED PRIVATE KEY FILE!"
error_full: |
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  @         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  Permissions 0644 for 'key.pem' are too open.
  It is required that your private key files are NOT accessible by others.
  This private key will be ignored.
cat: ssh
description: SSH refuses to use a private key that other users can read. Restrict it with chmod 600 (or 400).
tldr: "Run `chmod 600 key.pem` (or `chmod 400 key.pem`). On Windows, remove inherited permissions so only your user can read the file."
keywords: unprotected private key file permissions 0644 too open chmod 400 pem aws ec2 windows icacls
related: [ssh-permission-denied-publickey]
---
## What it means

Your private key file is readable by other users. SSH treats it as compromised and **ignores it**, which then usually leads to `Permission denied (publickey)`.

## Fix on Linux and macOS

```bash
chmod 600 ~/.ssh/key.pem      # or 400 for read-only
```

The `.ssh` folder itself should be `700`:

```bash
chmod 700 ~/.ssh
```

## Fix on Windows (OpenSSH in PowerShell)

`chmod` doesn't apply to NTFS. Remove inherited access and grant only yourself read access:

```powershell
icacls .\key.pem /inheritance:r
icacls .\key.pem /grant:r "$($env:USERNAME):(R)"
```

Or in Explorer: *Properties → Security → Advanced → Disable inheritance → Remove all inherited permissions*, then add only your user with Read.

## WSL with keys on /mnt/c

Files on Windows drives show up with permissions like `0777`, and `chmod` has no effect by default. Copy the key into your Linux home:

```bash
cp /mnt/c/Users/you/Downloads/key.pem ~/.ssh/
chmod 600 ~/.ssh/key.pem
```

(Or enable metadata for drvfs mounts in `/etc/wsl.conf`.)
