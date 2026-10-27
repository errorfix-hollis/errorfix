---
error: "git@github.com: Permission denied (publickey)."
error_full: |
  git@github.com: Permission denied (publickey).
  fatal: Could not read from remote repository.

  Please make sure you have the correct access rights
  and the repository exists.
cat: git
description: GitHub rejected your SSH key. Check that you have a key, that ssh-agent has it loaded, and that the public key is added to your GitHub account.
tldr: "Run `ssh -T git@github.com` to test. If it fails, create a key with `ssh-keygen -t ed25519`, add `~/.ssh/id_ed25519.pub` to GitHub → Settings → SSH keys, and try again."
keywords: ssh key github gitlab clone push publickey could not read from remote repository
related: [ssh-permission-denied-publickey, git-could-not-read-from-remote-repository]
---
## What it means

Git connected to GitHub over SSH, but none of the keys your SSH client offered belong to a GitHub account that can access the repository.

## Step 1: test the connection

```bash
ssh -T git@github.com
```

- `Hi username! You've successfully authenticated` means SSH works. The problem is access to the repo itself (wrong URL, or no permission).
- `Permission denied (publickey)` means your key is missing or not registered. Continue below.

## Step 2: check that you have a key

```bash
ls -al ~/.ssh
```

Look for `id_ed25519` and `id_ed25519.pub` (or `id_rsa` / `id_rsa.pub`). If there are none, create one:

```bash
ssh-keygen -t ed25519 -C "you@example.com"
```

## Step 3: load the key into ssh-agent

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

## Step 4: add the public key to GitHub

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the whole line and paste it in **GitHub → Settings → SSH and GPG keys → New SSH key**. Then run `ssh -T git@github.com` again.

## Other causes

- **Using sudo.** `sudo git clone ...` uses root's keys in `/root/.ssh`, not yours. Drop the `sudo`.
- **Key has a non-default name.** Tell SSH which key to use in `~/.ssh/config`:

```
Host github.com
  User git
  IdentityFile ~/.ssh/my_github_key
  IdentitiesOnly yes
```

- **Wrong permissions.** SSH ignores private keys that others can read: `chmod 700 ~/.ssh && chmod 600 ~/.ssh/id_ed25519`.
- **Port 22 blocked** (corporate network). Use GitHub's SSH-over-HTTPS host: set `Hostname ssh.github.com` and `Port 443` in the config block above.
- **You don't need SSH at all.** Switch the remote to HTTPS: `git remote set-url origin https://github.com/USER/REPO.git`.
