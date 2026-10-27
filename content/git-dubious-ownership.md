---
error: "fatal: detected dubious ownership in repository"
error_full: |
  fatal: detected dubious ownership in repository at '/path/to/repo'
  To add an exception for this directory, call:

          git config --global --add safe.directory /path/to/repo
cat: git
description: Git refuses to work in a repository owned by another user. Mark it as safe or fix the folder's ownership.
tldr: "If you trust the repo, run `git config --global --add safe.directory /path/to/repo`. Better: fix ownership with `sudo chown -R $(whoami) /path/to/repo`."
keywords: safe.directory dubious ownership docker wsl ntfs jenkins owned by someone else
related: [git-not-a-git-repository]
---
## What it means

Since Git 2.35.2, Git refuses to read a repository whose files belong to a **different user** than the one running Git. A malicious `.git/config` in a shared folder could otherwise make Git run commands as you.

## Fix 1: take ownership (best when it's your project)

```bash
sudo chown -R "$(whoami)" /path/to/repo
```

## Fix 2: mark the directory as safe

```bash
git config --global --add safe.directory /path/to/repo
```

To trust every directory (only on single-user machines or throwaway containers):

```bash
git config --global --add safe.directory '*'
```

## Common situations

- **Docker / CI containers.** The checkout is owned by a different UID than the user inside the container. Add the `safe.directory` line in your Dockerfile or CI step, or run the container with `--user "$(id -u):$(id -g)"`.
- **GitHub Actions in containers.** Run `git config --global --add safe.directory "$GITHUB_WORKSPACE"` before your git commands.
- **WSL with Windows drives (`/mnt/c/...`)** or **external NTFS/exFAT drives.** These file systems don't keep Linux owners. Use `safe.directory`, or keep repos in your Linux home folder.
- **You used `sudo git ...` once.** Some files are now owned by root. Fix with the `chown` command above.
