---
error: "fatal: The current branch has no upstream branch."
error_full: |
  fatal: The current branch feature-x has no upstream branch.
  To push the current branch and set the remote as upstream, use

      git push --set-upstream origin feature-x
cat: git
description: Your new local branch isn't linked to a remote branch yet. Push it once with -u, or tell Git to do this automatically.
tldr: "Run `git push -u origin HEAD` (or `git push --set-upstream origin feature-x`). To never see this again: `git config --global push.autoSetupRemote true`."
keywords: current branch has no upstream branch git push set-upstream origin new branch autoSetupRemote
related: [git-failed-to-push-some-refs, git-src-refspec-main-does-not-match-any]
---
## What it means

A plain `git push` pushes to the branch's **upstream** (the remote branch it tracks). A branch you just created locally has none yet, so Git doesn't know where to push.

## Fix

```bash
git push -u origin HEAD
```

`-u` (`--set-upstream`) links the branch, so later `git push` and `git pull` work without arguments. `HEAD` means "the current branch", so you don't have to type its name.

## Make it automatic (Git 2.37+)

```bash
git config --global push.autoSetupRemote true
```

Now the first `git push` on a new branch creates and tracks the remote branch by itself.

## Check what a branch tracks

```bash
git branch -vv
```

Link an existing remote branch without pushing:

```bash
git branch --set-upstream-to=origin/feature-x
```
