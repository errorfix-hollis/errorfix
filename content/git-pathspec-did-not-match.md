---
error: "error: pathspec 'x' did not match any file(s) known to git"
cat: git
description: Git can't find the branch or file you named. Fetch remote branches first, check spelling and case, or check the path is tracked.
tldr: "For a branch: `git fetch origin` then `git switch branch-name`. For a file: check the path and case with `git ls-files | grep name`."
keywords: pathspec did not match any files known to git checkout branch fetch add commit quotes windows
related: [git-src-refspec-main-does-not-match-any]
---
## What it means

Git interpreted what you typed as a **pathspec** (a file or branch name) and found nothing matching it.

## Case 1: checking out a branch

```bash
git checkout feature-x
# error: pathspec 'feature-x' did not match any file(s) known to git
```

The branch probably exists only on the remote and your local repo hasn't heard of it yet:

```bash
git fetch origin
git branch -a | grep feature-x
git switch feature-x        # creates a local branch tracking origin/feature-x
```

If you cloned with `--depth 1` or `--single-branch`, other branches aren't fetched. Fix with:

```bash
git remote set-branches origin '*'
git fetch origin
```

## Case 2: a file

- Check spelling and **case**: `README.md` ≠ `readme.md`.
- Paths are relative to your current directory.
- `git rm` / `git checkout -- file` only work on files Git tracks. List them: `git ls-files | grep name`.

## Case 3: commit messages on Windows

```bash
git commit -m 'my message'     # in cmd.exe, single quotes aren't quotes!
```

`cmd.exe` splits that into `'my` and `message'`, and Git treats the second word as a file. Use double quotes: `git commit -m "my message"`.
