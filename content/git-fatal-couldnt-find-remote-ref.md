---
error: "fatal: couldn't find remote ref main"
error_full: |
  $ git pull origin main
  fatal: couldn't find remote ref main
cat: git
description: "You asked Git to fetch or pull a branch name that does not exist on the remote. Most often the remote's default branch is master (or something else) while you typed main, or the remote is empty."
tldr: "List the branches the remote really has with `git ls-remote --heads origin`, then pull the right one (e.g. `git pull origin master`). Fix the tracking branch with `git branch -u origin/master`, and refresh the remote HEAD with `git remote set-head origin -a`."
keywords: git fatal couldn't find remote ref main master git pull origin main fetch branch does not exist remote ls-remote default branch upstream
related: [git-src-refspec-main-does-not-match-any, git-no-upstream-branch, git-you-appear-to-have-cloned-an-empty-repository]
---
## What it means

`git pull <remote> <branch>` and `git fetch <remote> <branch>` ask the remote for a ref named `refs/heads/<branch>`. If the remote has no ref with that name, Git stops with `couldn't find remote ref <name>`. Nothing is wrong with your local repository: the name you asked for just isn't there.

Check what the remote actually has:

```bash
git ls-remote --heads origin
# 4f1c...  refs/heads/master
# 9ab2...  refs/heads/develop
```

## Cause 1: main vs master

Older repositories (and many self-hosted servers) still use `master`; newer GitHub/GitLab repositories use `main`. Pulling the one that doesn't exist gives this error.

```bash
git pull origin master
```

If your local branch tracks the wrong name, fix the upstream so a plain `git pull` works:

```bash
git branch -u origin/master        # current branch now tracks origin/master
git remote set-head origin -a      # update origin/HEAD to the remote's default branch
```

If you'd rather rename your local branch to match the remote:

```bash
git branch -m main master
git branch -u origin/master
```

## Cause 2: typo or wrong case

Branch names are case-sensitive on the remote: `Feature/Login` and `feature/login` are different refs. Copy the exact name from `git ls-remote --heads origin` or `git branch -r` (after `git fetch`).

## Cause 3: the branch was deleted or never pushed

A colleague may have merged and deleted the branch, or never pushed it. Your local `origin/<branch>` can linger after deletion; prune stale remote-tracking refs:

```bash
git fetch --prune
git branch -r
```

If the upstream branch is gone, point your branch at another one (`git branch -u origin/main`) or push it yourself:

```bash
git push -u origin my-branch
```

## Cause 4: the remote repository is empty

A freshly created repository has no branches at all, so any `git pull origin main` fails. Push your first commit instead:

```bash
git push -u origin main
```

If that push fails with `src refspec main does not match any`, you don't have a local commit yet; see the related page.

## Cause 5: wrong remote

You may have several remotes (`origin`, `upstream`, a fork). Check where each one points:

```bash
git remote -v
git ls-remote --heads upstream
```

## Cause 6: a stale branch.<name>.merge setting

`git pull` with no arguments uses `branch.<name>.merge` from `.git/config`. If it still names an old branch, you get this error without typing any branch name:

```bash
git config --get branch.$(git branch --show-current).merge
git branch -u origin/main          # rewrites it
```
