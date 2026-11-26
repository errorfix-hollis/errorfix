---
error: "The following signatures were invalid: EXPKEYSIG"
error_full: |
  W: An error occurred during the signature verification. The repository is not updated and the previous index files will be used. GPG error: https://dl.yarnpkg.com/debian stable InRelease: The following signatures were invalid: EXPKEYSIG 23E7166788B63E1E Yarn Packaging <yarn@dan.cx>
  E: The repository 'https://dl.yarnpkg.com/debian stable InRelease' is not signed.
cat: linux
description: "apt found a valid signature on a repository's Release file, but the signing key stored on your system has expired. The vendor has usually extended or rotated the key, so you need to download the current key."
tldr: "Re-download the repository's current signing key into the keyring file its sources entry uses, e.g. `curl -fsSL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/yarn-archive-keyring.gpg --yes`, then `sudo apt update`. Find the key file with `grep -r signed-by /etc/apt/sources.list.d/`."
keywords: linux apt update expkeysig the following signatures were invalid gpg error expired key repository is not signed yarn signed-by keyring apt-key deprecated
related: [linux-apt-no-pubkey, linux-apt-release-file-is-not-valid-yet, linux-apt-hash-sum-mismatch]
---
## What it means

apt verifies each repository's `InRelease`/`Release.gpg` file with the keys it trusts. `EXPKEYSIG <keyid>` means the signature was made with a key you have, but your copy of that key is past its expiry date. apt then refuses to use the repository (newer apt versions make this an error; older ones a warning that uses stale package lists).

This is different from `NO_PUBKEY` (you don't have the key at all, see [NO_PUBKEY](/linux/linux-apt-no-pubkey/)) and `KEYEXPIRED` (similar meaning, reported by gpgv).

Most vendors extend the expiry date and republish the same key, so downloading it again fixes the error. Recurring offenders: Yarn, Google Chrome, PostgreSQL (apt.postgresql.org), MongoDB, NodeSource, Sury PHP.

## Step 1: find which repository and key file

The URL in the message identifies the repo. Find its sources entry and keyring:

```bash
grep -rn "yarnpkg" /etc/apt/sources.list /etc/apt/sources.list.d/
# deb [signed-by=/usr/share/keyrings/yarn-archive-keyring.gpg] https://dl.yarnpkg.com/debian stable main
```

Check the key's expiry:

```bash
gpg --show-keys /usr/share/keyrings/yarn-archive-keyring.gpg
```

## Fix 1: re-download the key to the same file (signed-by setups)

```bash
curl -fsSL https://dl.yarnpkg.com/debian/pubkey.gpg \
  | sudo gpg --dearmor --yes -o /usr/share/keyrings/yarn-archive-keyring.gpg
sudo apt update
```

Other common ones:

```bash
# Google Chrome
curl -fsSL https://dl.google.com/linux/linux_signing_key.pub \
  | sudo gpg --dearmor --yes -o /usr/share/keyrings/google-chrome.gpg

# PostgreSQL PGDG
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | sudo gpg --dearmor --yes -o /usr/share/keyrings/postgresql.gpg
```

Use the path that your `signed-by=` actually references. If the key file ends in `.asc`, save the ASCII key directly without `--dearmor`.

## Fix 2: legacy apt-key keyring

If the sources entry has no `signed-by`, the key is in `/etc/apt/trusted.gpg` or `/etc/apt/trusted.gpg.d/`. Refresh it by key ID:

```bash
sudo apt-key adv --keyserver hkps://keyserver.ubuntu.com --recv-keys 23E7166788B63E1E
```

`apt-key` is deprecated (and removed in Debian 13 and newer Ubuntu releases), so better migrate: download the key to `/usr/share/keyrings/NAME.gpg` as in Fix 1, add `[signed-by=/usr/share/keyrings/NAME.gpg]` to the `deb` line, and delete the old key with `sudo apt-key del 23E7166788B63E1E`.

## Fix 3: the key was rotated, not extended

If the freshly downloaded key still shows as expired, or the error turns into `NO_PUBKEY` with a new ID, the vendor switched to a new key. Follow their current install docs to get the new key and sources line. Package-managed keyrings (e.g. `ubuntu-keyring`, `debian-archive-keyring`, `postgresql-common`) can be updated with:

```bash
sudo apt install --reinstall debian-archive-keyring   # or ubuntu-keyring
```

## Fix 4: you don't need the repository anymore

Remove the entry and move on:

```bash
sudo rm /etc/apt/sources.list.d/yarn.list
sudo apt update
```

(Yarn is nowadays installed via `corepack enable` with Node.js, so the Debian repo is often unnecessary.)

## Don't

Don't use `[trusted=yes]` or `--allow-unauthenticated` to silence this. That disables signature checks for the repository entirely.

## Also check the clock

If many keys suddenly look expired, check `date`. A system clock far in the future makes valid keys appear expired: fix with `sudo timedatectl set-ntp true`.
