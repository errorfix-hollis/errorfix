---
error: "error: Your local changes to the following files would be overwritten by merge"
error_full: |
  error: Your local changes to the following files would be overwritten by merge:
          config.php
  Please commit your changes or stash them before you merge.
  Aborting
cat: git
description: You have uncommitted edits to files the pull/merge would change. Commit them, stash them, or discard them, then pull again.
tldr: "Keep your changes: `git stash`, `git pull`, `git stash pop`. Throw them away: `git restore <file>` (or `git checkout -- <file>`), then pull."
keywords: git pull local changes would be overwritten by merge checkout stash commit before merge
related: [git-failed-to-push-some-refs]
---
## What it means

The incoming commits modify files that you have also modified locally but **not committed**. Git stops instead of silently overwriting your edits.

## Option 1: keep your changes with stash

```bash
git stash
git pull
git stash pop
```

If `stash pop` causes conflicts, edit the files, `git add` them, and your stash stays in the list until you drop it with `git stash drop`.

## Option 2: commit them first

```bash
git add -A
git commit -m "WIP"
git pull           # or: git pull --rebase
```

## Option 3: discard your local changes

**This permanently deletes your uncommitted edits** to those files:

```bash
git restore config.php      # one file
git restore .               # everything
git pull
```

On Git older than 2.23 use `git checkout -- config.php`.

To make the local branch exactly match the remote (also deletes local commits):

```bash
git fetch origin
git reset --hard origin/main
```

## Same error with checkout/switch

`error: Your local changes ... would be overwritten by checkout` has the same fixes. You can also carry your edits to the other branch with `git switch -c new-branch` if the branch doesn't exist yet.

## Machine-specific config files

If a file like `config.php` or `.env` is always different on each machine, stop tracking it: add it to `.gitignore`, then `git rm --cached config.php` and commit.
