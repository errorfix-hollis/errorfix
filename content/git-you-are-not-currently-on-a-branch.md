---
error: "fatal: You are not currently on a branch."
error_full: |
  fatal: You are not currently on a branch.
  To push the history leading to the current (detached HEAD)
  state now, use

      git push origin HEAD:<name-of-remote-branch>
cat: git
description: "git push or git pull was run while HEAD is detached (pointing at a commit, not a branch), so Git doesn't know which branch to update."
tldr: "Run `git status` to see where you are. To keep your commits, create a branch: `git switch -c my-fix` then `git push -u origin my-fix`. If you were mid-rebase, finish it with `git rebase --continue` (or `--abort`). To push straight to a remote branch: `git push origin HEAD:main`."
keywords: git fatal you are not currently on a branch detached head push pull rebase in progress git switch -c HEAD:main submodule
related: [git-detached-head, git-failed-to-push-some-refs, git-no-upstream-branch]
---
## What it means

Normally `HEAD` points at a branch (`refs/heads/main`), and `git push`/`git pull` use that branch and its upstream. In *detached HEAD* state, `HEAD` points straight at a commit, so there is no current branch to push or pull. Git refuses rather than guessing.

Check your state:

```bash
git status
# HEAD detached at 3f2a1bc
# or: interactive rebase in progress; onto 9c0d...
git log --oneline -5
```

## Cause 1: you checked out a tag, a commit or a remote branch

`git checkout v1.2.0`, `git checkout 3f2a1bc` or `git checkout origin/main` all detach HEAD. If you made commits there, put them on a branch before doing anything else:

```bash
git switch -c my-fix        # new branch at the current commit
git push -u origin my-fix
```

If you meant to work on an existing branch, switch to it and bring the commits over:

```bash
git branch tmp              # save detached commits
git switch main
git merge tmp               # or: git cherry-pick <sha>
git branch -d tmp
```

## Cause 2: a rebase is in progress

During `git rebase`, HEAD is detached until the rebase finishes. If a conflict stopped it:

```bash
# fix files, then
git add <files>
git rebase --continue
# or give up and go back
git rebase --abort
```

After it completes you are back on your branch and can push (often with `--force-with-lease` after a rebase).

## Cause 3: submodules

Submodules are checked out at a specific commit, so they are always detached by default. Before committing inside one:

```bash
cd path/to/submodule
git switch main             # or the branch you track
git pull
```

Or use `git submodule update --remote --merge`.

## Cause 4: CI pipelines

Many CI systems (GitHub Actions, GitLab CI, Jenkins) check out a single commit, leaving HEAD detached. Push with an explicit refspec:

```bash
git push origin HEAD:main
# GitLab
git push origin HEAD:"$CI_COMMIT_REF_NAME"
```

For `git pull`, also name the branch: `git pull origin main`.

## Recovering "lost" commits

If you already switched away and your detached commits seem gone, find them in the reflog:

```bash
git reflog
git branch rescue <sha>
```
