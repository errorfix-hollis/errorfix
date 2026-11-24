---
error: "error: The following untracked working tree files would be overwritten by merge"
error_full: |
  error: The following untracked working tree files would be overwritten by merge:
          config/settings.json
          src/generated/schema.ts
  Please move or remove them before you merge.
  Aborting
cat: git
description: "Files that exist in your folder but are not tracked by git are also present in the commit you are pulling, merging or checking out. Git refuses to silently replace them."
tldr: "Back up anything you need, then remove only the listed files and retry: `git clean -n` to preview, `git clean -f -- path/to/file` (or just `rm` them), then `git pull`. To keep your versions, move them aside first. To take the remote version of everything: `git fetch && git reset --hard origin/main` (destroys local changes)."
keywords: git error the following untracked working tree files would be overwritten by merge checkout please move or remove them before you merge aborting git clean pull
related: [git-your-local-changes-would-be-overwritten, git-merge-conflict, git-cannot-pull-with-rebase-unstaged-changes]
---
## What it means

An *untracked* file is in your working directory but has never been committed (`git status` shows it under "Untracked files"). The incoming commit adds a file at the same path. Git has no copy of your version, so overwriting it would lose data permanently. It aborts instead and leaves everything as it was.

Common reasons: you created the file by hand before someone committed it, a build step generated it, or a file was removed from `.gitignore` upstream and committed.

The same message appears with `by checkout` when switching branches, and with `git rebase`.

## Fix 1: remove or move the listed files (safe, recommended)

First check whether your copy differs from the incoming one:

```bash
git fetch
git diff --no-index config/settings.json <(git show origin/main:config/settings.json)
```

If you don't need them, delete just those files and pull again:

```bash
rm config/settings.json src/generated/schema.ts
git pull
```

If you want to keep them for reference, move them out of the way:

```bash
mkdir -p ../backup && mv config/settings.json ../backup/
git pull
```

## Fix 2: many files - `git clean`

`git clean` deletes untracked files. Always do a dry run first:

```bash
git clean -n            # list what would be deleted
git clean -f            # delete untracked files
git clean -fd           # ... and untracked directories
```

`git clean` does not delete ignored files unless you add `-x`. Scope it to a path to be safe: `git clean -fd -- src/generated/`.

## Fix 3: stash untracked files too

```bash
git stash push --include-untracked
git pull
git stash pop
```

`stash pop` may then report conflicts for those files; resolve as usual. Plain `git stash` ignores untracked files, which is why it doesn't help on its own.

## Fix 4: take the remote version of everything

When the local copy is a throwaway clone (CI, server deployment):

```bash
git fetch origin
git reset --hard origin/main
git clean -fd
```

This discards all local commits and changes. For checkout between branches, `git checkout -f other-branch` overwrites untracked files that conflict.

## Prevent it

Generated files (build output, `.env`, IDE folders, lockfiles you regenerate) should not be committed. Add them to `.gitignore` (the [gitignore generator](/tools/gitignore-generator/) helps) and remove them from the repo with `git rm --cached path`. If a teammate committed a generated file, agree on one policy, otherwise everyone hits this error after every build.

## Tracked files version

If git lists files with *"Your local changes to the following files would be overwritten"*, they are tracked and modified; see [Your local changes would be overwritten](/git/git-your-local-changes-would-be-overwritten/).
