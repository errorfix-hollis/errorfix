---
error: "Load key \"id_rsa\": invalid format"
error_full: |
  Load key "/home/me/.ssh/id_rsa": invalid format
  git@github.com: Permission denied (publickey).
cat: ssh
description: "OpenSSH couldn't parse the private key file. It is usually damaged (missing newline, Windows line endings, copied with spaces from a CI variable), it is a public key or a PuTTY .ppk file, or the wrong file is passed with -i."
tldr: "Check the file starts with `-----BEGIN OPENSSH PRIVATE KEY-----` and ends with a newline after the END line. Fix line endings with `dos2unix ~/.ssh/id_rsa`, convert PuTTY keys with `puttygen key.ppk -O private-openssh -o id_rsa`, validate with `ssh-keygen -y -f ~/.ssh/id_rsa`. In CI, store the key with real newlines and `echo \"$SSH_KEY\" > key` (quotes matter)."
keywords: ssh load key invalid format private key error in libcrypto openssh private key missing newline crlf dos2unix ppk puttygen github actions gitlab ci ssh-keygen -y -f wrong key file
related: [ssh-permission-denied-publickey, ssh-unprotected-private-key-file, git-permission-denied-publickey]
---
## What it means

When ssh loads an identity it parses the private key. "invalid format" (on newer OpenSSH builds often `error in libcrypto`) means the file isn't a valid private key in a format OpenSSH understands. Authentication then continues without that key, so you usually see `Permission denied (publickey)` next.

Check the file:

```bash
head -1 ~/.ssh/id_rsa; tail -1 ~/.ssh/id_rsa
ssh-keygen -y -f ~/.ssh/id_rsa     # prints the public key if the private key is valid
file ~/.ssh/id_rsa
```

Valid first lines are `-----BEGIN OPENSSH PRIVATE KEY-----`, `-----BEGIN RSA PRIVATE KEY-----`, `-----BEGIN EC PRIVATE KEY-----` or `-----BEGIN PRIVATE KEY-----`.

## Cause 1: missing final newline

OpenSSH requires a newline after `-----END ... PRIVATE KEY-----`. Keys pasted from a password manager or a CI variable often lose it.

```bash
echo >> ~/.ssh/id_rsa
ssh-keygen -y -f ~/.ssh/id_rsa
```

## Cause 2: Windows line endings or stray whitespace

A key saved with CRLF, or with spaces at the line ends, fails to parse:

```bash
sed -i 's/\r$//' ~/.ssh/id_rsa      # or: dos2unix ~/.ssh/id_rsa
sed -i 's/[[:space:]]*$//' ~/.ssh/id_rsa
```

Check for invisible characters offline with `cat -A ~/.ssh/id_rsa | head -3`: `^M` at the line ends means CRLF. Never paste a real private key into a website.

## Cause 3: CI variables (GitHub Actions, GitLab CI)

The newlines get collapsed into spaces when the variable is echoed unquoted:

```bash
echo $SSH_PRIVATE_KEY > key          # wrong: newlines become spaces
echo "$SSH_PRIVATE_KEY" > key        # right
chmod 600 key
```

Better options:

- GitLab: use a variable of type **File**, then `chmod 600 "$SSH_PRIVATE_KEY"` and `ssh -i "$SSH_PRIVATE_KEY"`.
- Load into an agent: `echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -` (after `eval "$(ssh-agent -s)"`).
- If newlines can't be stored, base64-encode the key and decode it in the job: `echo "$SSH_KEY_B64" | base64 -d > key`.
- GitHub Actions: `webfactory/ssh-agent` handles this for you.

## Cause 4: wrong file (public key, .ppk, certificate)

- `-i ~/.ssh/id_rsa.pub` or `IdentityFile ...pub`: point to the private key (no `.pub`).
- A PuTTY key starts with `PuTTY-User-Key-File-`. Convert it:

```bash
sudo apt install putty-tools
puttygen key.ppk -O private-openssh -o ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
```

On Windows, open PuTTYgen → Load → Conversions → Export OpenSSH key.

## Cause 5: new key format, old client

Keys created by OpenSSH 7.8+ use `BEGIN OPENSSH PRIVATE KEY`. Very old tools (some Java/Python libraries, old Jenkins plugins) only read PEM. Convert in place (keeps the passphrase):

```bash
cp ~/.ssh/id_rsa ~/.ssh/id_rsa.bak
ssh-keygen -p -m PEM -f ~/.ssh/id_rsa
```

Ed25519 keys can't be stored as PEM `RSA PRIVATE KEY`; use an RSA/ECDSA key for such tools, or upgrade them.

## Cause 6: the file is truncated or corrupted

If none of the above helps, the key is broken. Generate a new one and register its public key on the server or Git host:

```bash
ssh-keygen -t ed25519 -C "me@laptop"
cat ~/.ssh/id_ed25519.pub
```
