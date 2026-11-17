---
error: "Your branch is behind 'origin/main' by N commits, and can be fast-forwarded."
error_full: |
  On branch main
  Your branch is behind 'origin/main' by 3 commits, and can be fast-forwarded.
    (use "git pull" to update your local branch)
cat: git
description: "Not an error: the remote branch has commits you don't have locally, and you have no local commits of your own, so Git can simply move your branch forward. Related states are 'ahead' (you have unpushed commits) and 'have diverged' (both)."
tldr: "Run `git pull` (or `git merge --ff-only origin/main`). If it says 'ahead by N', run `git push`. If the branches 'have diverged', use `git pull --rebase` or `git pull --no-rebase`, and if you want to throw local work away, `git reset --hard origin/main`."
keywords: git your branch is behind origin main by commits can be fast-forwarded ahead have diverged git status git pull fast-forward reset hard
related: [git-need-to-specify-how-to-reconcile-divergent-branches, git-not-possible-to-fast-forward-aborting, git-failed-to-push-some-refs]
---
## What it means

`git status` compares your local branch with its upstream (the remote-tracking branch `origin/main`) *as of the last fetch*. There are three possible messages:

| Message | Meaning | Usual command |
|---|---|---|
| `behind ... by N commits, and can be fast-forwarded` | remote has new commits, you have none | `git pull` |
| `ahead of 'origin/main' by N commits` | you have commits not pushed yet | `git push` |
| `have diverged, and have X and Y different commits each` | both sides have new commits | `git pull --rebase` or merge |

Remember that `origin/main` only updates on `git fetch` / `git pull`. "Up to date" can be stale; run `git fetch` first to get the real picture.

## Fix 1: behind - fast-forward

```bash
git pull
# or, safest (never creates a merge commit):
git fetch
git merge --ff-only origin/main
```

If `git pull` refuses because of local uncommitted changes (`Your local changes would be overwritten`), stash them:

```bash
git stash
git pull
git stash pop
```

## Fix 2: ahead - push

```bash
git log origin/main..HEAD --oneline   # what you're about to push
git push
```

If you are "ahead" but didn't mean to commit to `main`, move the commits to a branch:

```bash
git branch my-feature            # keep the commits on a new branch
git reset --hard origin/main     # put main back where the remote is
git switch my-feature
```

## Fix 3: diverged

See what's on each side:

```bash
git log --oneline --left-right --graph HEAD...origin/main
```

Then either replay your commits on top of the remote:

```bash
git pull --rebase
```

or create a merge commit:

```bash
git pull --no-rebase
```

To make one behavior the default: `git config --global pull.rebase true` (or `false`, or `pull.ff only`).

## Fix 4: discard local commits and match the remote exactly

Only if you're sure you don't need your local commits or changes:

```bash
git fetch origin
git reset --hard origin/main
```

`git reflog` can still recover the old commits for a while if you change your mind.

## "Behind" right after you pushed?

If `git status` says you're behind after a force push by someone else, or after the remote was rewritten, a plain `git pull` will create a messy merge. Check with the `--graph` command above; if the remote was rewritten on purpose, use `git reset --hard origin/main` (after saving any local work on a branch).

## Seeing how far behind without pulling

```bash
git fetch
git rev-list --left-right --count HEAD...origin/main   # prints: ahead behind
```
