---
error: "fatal: Need to specify how to reconcile divergent branches."
error_full: |
  hint: You have divergent branches and need to specify how to reconcile them.
  hint: You can do so by running one of the following commands sometime before
  hint: your next pull:
  hint:
  hint:   git config pull.rebase false  # merge
  hint:   git config pull.rebase true   # rebase
  hint:   git config pull.ff only       # fast-forward only
  hint:
  hint: You can replace "git config" with "git config --global" to set a default
  hint: preference for all repositories. You can also pass --rebase, --no-rebase,
  hint: or --ff-only on the command line to override the configured default per
  hint: invocation.
  fatal: Need to specify how to reconcile divergent branches.
cat: git
description: "Your local branch and the remote branch both have commits the other doesn't, and Git (2.33+) won't guess whether git pull should merge or rebase. Nothing is broken; you just have to choose."
tldr: "Choose once per pull with `git pull --rebase` (replay your commits on top) or `git pull --no-rebase` (merge commit). Set a default with `git config --global pull.rebase true` (or `false`). If you have no local commits worth keeping, reset instead: `git fetch && git reset --hard origin/main`."
keywords: git pull hint you have divergent branches and need to specify how to reconcile them fatal need to specify how to reconcile divergent branches pull.rebase pull.ff only rebase merge
related: [git-not-possible-to-fast-forward-aborting, git-failed-to-push-some-refs, git-merge-conflict]
---
## What it means

`git pull` is `git fetch` followed by integrating `origin/<branch>` into your branch. When both sides have new commits the history has **diverged**:

```
      A---B---C   origin/main
     /
D---E---F---G     main (your local commits F, G)
```

Git can combine them in two ways — a merge commit, or rebasing F and G on top of C. Since Git 2.27 it warned when you hadn't picked a default, and since about Git 2.33.1 it refuses to pull until you do. Your work is untouched; no merge happened yet.

See what diverged:

```bash
git fetch
git log --oneline --graph main origin/main
git status          # "Your branch and 'origin/main' have diverged, and have 2 and 3 different commits each"
```

## Fix 1: rebase your commits on top (linear history)

```bash
git pull --rebase
```

Your local commits are replayed after the remote ones. If a conflict appears, fix the files, then:

```bash
git add <file>
git rebase --continue      # or: git rebase --abort to go back
```

Don't rebase commits you have already pushed and others built on — that rewrites shared history.

## Fix 2: merge (keeps both histories, adds a merge commit)

```bash
git pull --no-rebase
```

This is the old default behaviour. Resolve any conflicts, `git add`, then `git commit`.

## Fix 3: set a default so the message stops

Pick one, globally or per repository (drop `--global`):

```bash
git config --global pull.rebase true    # always rebase
git config --global pull.rebase false   # always merge
git config --global pull.ff only        # refuse unless fast-forward is possible
```

`pull.ff only` is the safest: pulls that would create a merge or rebase stop with `fatal: Not possible to fast-forward, aborting.` and you decide case by case. Many people combine `pull.rebase true` with `rebase.autoStash true` so uncommitted changes are stashed automatically.

## Fix 4: you don't need your local commits — reset to the remote

If the local commits are mistakes, or the remote was force-pushed (for example after someone rebased the branch), make your branch identical to the remote:

```bash
git fetch origin
git branch backup-before-reset       # optional safety net
git reset --hard origin/main
```

`reset --hard` discards local commits **and** uncommitted changes. The backup branch lets you recover them.

## Fix 5: the remote has nothing you need — push instead

If the remote commits should be replaced by yours (e.g. you amended a commit you'd already pushed to your own feature branch):

```bash
git push --force-with-lease
```

`--force-with-lease` refuses to overwrite commits you haven't fetched. Never force-push to shared branches like `main` without agreement.

## Which should I choose?

| Situation | Command |
|---|---|
| Personal feature branch, unpushed local commits | `git pull --rebase` |
| Shared branch, team prefers merge commits | `git pull --no-rebase` |
| You never commit on this branch locally | `git config pull.ff only` |
| Local commits are junk / remote was rewritten | `git reset --hard origin/main` |

IDEs (VS Code, JetBrains) show the same error when their "Sync"/"Pull" button runs `git pull`; setting `pull.rebase` globally fixes them too.
