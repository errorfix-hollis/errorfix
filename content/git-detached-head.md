---
error: "You are in 'detached HEAD' state."
error_full: |
  Note: switching to 'a1b2c3d'.

  You are in 'detached HEAD' state. You can look around, make experimental
  changes and commit them, and you can discard any commits you make in this
  state without impacting any branches by switching back to a branch.
cat: git
description: HEAD points to a commit, not a branch. Switch back to a branch, or create one here to keep any commits you made.
tldr: "To keep work you did here: `git switch -c my-branch`. To go back: `git switch main`."
keywords: detached head git checkout commit tag lost commits switch branch reflog
related: [git-your-local-changes-would-be-overwritten]
---
## What it means

Normally `HEAD` points to a branch (like `main`), and new commits move that branch forward. You checked out a **commit, tag, or remote branch** directly, so `HEAD` points to a bare commit. New commits here don't belong to any branch.

It's not an error. It's a warning that commits made now are easy to lose.

## Just looking around? Go back

```bash
git switch main          # or: git checkout main
```

## Made commits you want to keep?

Create a branch where you are, before switching away:

```bash
git switch -c my-fix
```

## Already switched away and lost the commits?

They still exist for a while. Find them in the reflog:

```bash
git reflog
# a1b2c3d HEAD@{2}: commit: my lost work
git branch recovered a1b2c3d
```

## Why it happens

- `git checkout <commit-hash>` or `git checkout v1.2.0` (a tag)
- `git checkout origin/main` (remote-tracking branch). Use `git switch main` instead, which creates a local branch tracking it.
- During `git rebase` or `git bisect`, Git temporarily detaches HEAD. Finish with `git rebase --continue` / `git bisect reset`.
- CI systems and submodules often check out a specific commit. That's expected.
