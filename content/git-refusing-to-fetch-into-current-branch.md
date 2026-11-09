---
error: "fatal: refusing to fetch into branch 'refs/heads/main' checked out at ..."
error_full: |
  fatal: refusing to fetch into branch 'refs/heads/main' checked out at '/home/me/project'
  fatal: Refusing to fetch into current branch refs/heads/main of non-bare repository
cat: git
description: "You ran git fetch with a refspec that writes directly into the branch you have checked out. Git refuses because it would change the branch under your working tree without updating your files."
tldr: "Don't fetch into the current branch. Use `git pull origin main` (fetch + merge), or `git fetch origin` then `git merge origin/main`. If you really want to update a local branch with fetch, switch away from it first: `git switch other && git fetch origin main:main`."
keywords: git fatal refusing to fetch into current branch non-bare repository fetch origin main:main checked out at update-head-ok
related: [git-not-possible-to-fast-forward-aborting, git-failed-to-push-some-refs, git-your-local-changes-would-be-overwritten]
---
## What it means

`git fetch origin main:main` means "download `main` from origin and write it into my local branch `main`". If `main` is the branch you have checked out (in this worktree or another worktree), updating its ref would leave your index and working files out of sync with `HEAD`. Git refuses rather than silently corrupt your state.

Newer Git phrases it as "refusing to fetch into branch ... checked out at <path>", which also triggers when the branch is checked out in **another worktree**.

## Fix 1: use pull or fetch + merge

Normally you don't want to write into the local branch with fetch at all. Fetch updates remote-tracking refs (`origin/main`); then integrate:

```bash
git fetch origin
git merge origin/main         # or: git rebase origin/main
```

Or in one step:

```bash
git pull origin main
```

## Fix 2: update a branch you are NOT on

The `src:dst` fetch form is handy for fast-forwarding another local branch without checking it out:

```bash
git switch feature
git fetch origin main:main    # fast-forwards local main, works now
```

It only succeeds if it's a fast-forward; add `+` (`+main:main`) to force, which discards local commits on that branch.

## Fix 3: the branch is checked out in another worktree

```bash
git worktree list
```

If `main` is checked out in another worktree, either run `git pull` inside that worktree, switch that worktree to another branch, or remove it:

```bash
git worktree remove ../project-main
```

## Fix 4: scripts and CI with a bad refspec

A config like this triggers it on every plain `git fetch`:

```ini
[remote "origin"]
    fetch = +refs/heads/*:refs/heads/*
```

That maps remote branches straight onto local ones — only correct for bare mirrors. Restore the default:

```bash
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
```

## Fix 5: you know what you're doing

`git fetch --update-head-ok origin main:main` bypasses the check (used internally by `git pull`). Afterwards your working tree doesn't match `HEAD`; run `git reset --hard HEAD` only if you have no uncommitted changes worth keeping. Fix 1 is almost always the better choice.

## Related

In a non-bare repo the same protection exists on the push side: pushing to a checked-out branch fails with "refusing to update checked out branch". Push to a bare repo instead, or set `receive.denyCurrentBranch updateInstead` on the server repo.
