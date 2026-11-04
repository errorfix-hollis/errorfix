---
error: "error: cannot pull with rebase: You have unstaged changes."
error_full: |
  error: cannot pull with rebase: You have unstaged changes.
  error: please commit or stash them.
cat: git
description: "`git pull` is configured to rebase, and rebase refuses to start while the working tree has uncommitted changes. Stash or commit them first, or let Git do it with `--autostash`."
tldr: "Run `git pull --rebase --autostash` (or `git stash && git pull && git stash pop`). To make it permanent: `git config --global rebase.autoStash true`. If the changes are junk, discard them with `git restore .`."
keywords: git cannot pull with rebase you have unstaged changes please commit or stash them autostash pull.rebase git stash pop uncommitted changes
related: [git-your-local-changes-would-be-overwritten, git-not-possible-to-fast-forward-aborting, git-merge-conflict]
---
## What it means

Your `git pull` is doing `fetch` + `rebase` (because of `pull.rebase=true`, `--rebase`, or an IDE setting). A rebase rewrites your local commits on top of the remote branch and needs a clean working tree to do that safely. Any modified tracked file blocks it, even if the remote changes don't touch that file. (`error: cannot pull with rebase: Your index contains uncommitted changes.` is the same thing for staged changes.)

See what's dirty:

```bash
git status --short
```

## Fix 1: autostash (one command)

```bash
git pull --rebase --autostash
```

Git stashes your changes, rebases, then re-applies the stash. Make it the default:

```bash
git config --global rebase.autoStash true
```

If re-applying conflicts, Git tells you; resolve the files, `git add` them, and the stash is kept in `git stash list` so nothing is lost.

## Fix 2: stash manually

```bash
git stash push -m "wip before pull"
git pull
git stash pop
```

Include untracked files with `git stash -u` if they'd collide with incoming files. If `git stash pop` conflicts, fix the files, then `git add` them and `git stash drop`.

## Fix 3: commit first

If the work is meaningful, commit it — it will be rebased along with your other local commits:

```bash
git add -A
git commit -m "WIP: feature X"
git pull --rebase
```

You can tidy the WIP commit later with `git commit --amend` or an interactive rebase before pushing.

## Fix 4: discard the changes

Only if you're sure you don't need them:

```bash
git restore .              # discard modifications to tracked files
git restore --staged .     # unstage
git clean -fd              # delete untracked files/dirs (careful)
git pull
```

## Changes you didn't make (line endings, file mode)

Sometimes files show as modified right after cloning: line-ending conversion (`core.autocrlf`) or permission bits (`core.fileMode`) differ from the repo.

```bash
git diff --stat          # many files, no visible content change?
git diff -w | head       # empty -> only whitespace/line endings
git config core.fileMode false   # ignore chmod-only changes
```

Add a `.gitattributes` with `* text=auto` to normalize line endings for the repo.

## Prefer merge instead of rebase?

If you don't want `git pull` to rebase at all:

```bash
git config --global pull.rebase false   # merge
git config --global pull.ff only        # or: only fast-forward, fail otherwise
```

Merging also refuses to overwrite local changes in files it needs to update, but it doesn't require a fully clean tree.
