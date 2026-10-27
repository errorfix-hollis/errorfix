---
error: "error: remote origin already exists."
cat: git
description: A remote named origin is already configured. Change its URL with git remote set-url, or remove it first.
tldr: "Update the URL: `git remote set-url origin https://github.com/USER/REPO.git`. Check with `git remote -v`."
keywords: remote origin already exists git remote add set-url remove rename
related: [git-could-not-read-from-remote-repository]
---
## What it means

`git remote add origin <url>` creates a remote called `origin`, but this repository already has one, often because you cloned it or ran the command before.

## See what's configured

```bash
git remote -v
```

## Fix 1: change the URL

```bash
git remote set-url origin https://github.com/USER/REPO.git
```

## Fix 2: remove and add again

```bash
git remote remove origin
git remote add origin https://github.com/USER/REPO.git
```

## Fix 3: keep both

Want to push to a fork and the original? Give the new one another name:

```bash
git remote add upstream https://github.com/ORIGINAL/REPO.git
git fetch upstream
```

A common convention: `origin` = your fork, `upstream` = the original project.
