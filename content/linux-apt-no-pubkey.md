---
error: "The following signatures couldn't be verified because the public key is not available: NO_PUBKEY"
error_full: |
  W: GPG error: https://download.docker.com/linux/ubuntu jammy InRelease: The following signatures couldn't be verified because the public key is not available: NO_PUBKEY 7EA0A9C3F273FCD8
  E: The repository 'https://download.docker.com/linux/ubuntu jammy InRelease' is not signed.
  N: Updating from such a repository can't be done securely, and is therefore disabled by default.
cat: linux
description: "apt has a repository configured but not the GPG key that signs it, so it refuses to trust it. Download the vendor's key into /etc/apt/keyrings and reference it with signed-by in the source entry."
tldr: "Fetch the repo's key and point the source at it: `sudo install -d -m 0755 /etc/apt/keyrings && curl -fsSL <KEY_URL> | sudo gpg --dearmor -o /etc/apt/keyrings/vendor.gpg`, then use `deb [signed-by=/etc/apt/keyrings/vendor.gpg] ...` in /etc/apt/sources.list.d/vendor.list and run `sudo apt-get update`. `apt-key adv --recv-keys` is deprecated."
keywords: apt no_pubkey public key is not available repository is not signed gpg error signed-by keyrings apt-key deprecated docker repo key expired ubuntu debian apt update
related: [linux-apt-hash-sum-mismatch, linux-e-unable-to-locate-package, linux-dpkg-returned-an-error-code-1]
---
## What it means

Third-party apt repositories (Docker, Google Chrome, NodeSource, PostgreSQL, Microsoft...) are signed with the vendor's GPG key. apt verifies the repository's `InRelease` file against the keys it trusts. `NO_PUBKEY 7EA0A9C3F273FCD8` means the signature was made with a key apt doesn't have, so the repo is disabled (`is not signed`) and its packages can't be installed.

Typical reasons: the key was never added, it was added to the wrong place, the source line's `signed-by` points to a missing file, or the vendor rotated its key.

## Fix 1: add the key the modern way (signed-by)

Download the vendor's key (the URL is in their install docs) into `/etc/apt/keyrings`:

```bash
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

Then reference it in the source entry:

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
```

If the key file is already binary (`file key.gpg` says "OpenPGP Public Key" rather than "PGP public key block"), skip `--dearmor`; ASCII-armored `.asc` files can also be used directly with `signed-by`.

## Fix 2: the key ID is known but you have no URL

Fetch by fingerprint from a keyserver into a dedicated keyring:

```bash
sudo gpg --no-default-keyring --keyring /etc/apt/keyrings/vendor.gpg \
  --keyserver hkps://keyserver.ubuntu.com --recv-keys 7EA0A9C3F273FCD8
sudo chmod a+r /etc/apt/keyrings/vendor.gpg
```

Then add `signed-by=/etc/apt/keyrings/vendor.gpg` to that repo's line. Only trust a key whose fingerprint matches the vendor's documentation.

## Fix 3: the old apt-key approach

Older guides say:

```bash
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 7EA0A9C3F273FCD8
```

`apt-key` is deprecated (it warns since Ubuntu 22.04 and is no longer shipped in the newest Debian and Ubuntu releases) because a key in the global keyring is trusted for *every* repository. It may still work on older systems, but prefer Fix 1. If you see `Key is stored in legacy trusted.gpg keyring`, migrate that key to `/etc/apt/keyrings` with `signed-by`.

## Fix 4: the vendor rotated or the key expired

If the key used to work, the vendor likely published a new one, or the old one expired (`EXPKEYSIG` / `KEYEXPIRED` instead of `NO_PUBKEY`). Re-download the key from the vendor's current docs, overwriting the old file, and `apt-get update`.

## Fix 5: signed-by path is wrong

Check the source entry and that the file exists and is readable:

```bash
grep -r signed-by /etc/apt/sources.list /etc/apt/sources.list.d/
ls -l /etc/apt/keyrings/ /usr/share/keyrings/
```

A file with mode `0600` owned by root fails, because apt reads keys as the unprivileged `_apt` user: `sudo chmod 644` it. Two entries for the same repo with different `signed-by` values cause `Conflicting values set for option Signed-By`; remove the duplicate.

## Fix 6: you don't need the repo anymore

Remove the stale entry so `apt update` is clean:

```bash
sudo rm /etc/apt/sources.list.d/oldvendor.list
sudo apt-get update
```

## Don't

Avoid `[trusted=yes]` or `--allow-unauthenticated`. They disable signature checks and let anyone on the network path feed you packages.
