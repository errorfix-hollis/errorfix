---
error: "error: src refspec main does not match any"
error_full: |
  error: src refspec main does not match any
  error: failed to push some refs to 'origin'
cat: git
description: Git can't find a local branch called main. Either you have no commits yet or your branch is named master.
tldr: "Check your branch name with `git branch`. If it says `master`, push that (`git push origin master`) or rename it with `git branch -M main`. If there are no commits, commit first."
keywords: git push src refspec master main does not match any new repository first push
related: [git-failed-to-push-some-refs]
---
## What it means

The `main` in `git push origin main` is a **local branch name**, and Git can't find a local branch with that name.

## Cause 1: no commits yet

A brand-new repository has no branch until the first commit.

```bash
git add .
git commit -m "Initial commit"
git push -u origin main
```

If `git commit` says "nothing to commit", you have no files staged. Check `git status`.

## Cause 2: your branch is called master (or something else)

```bash
git branch
```

If it shows `* master`, either push that:

```bash
git push -u origin master
```

or rename it to `main` (what GitHub expects by default):

```bash
git branch -M main
git push -u origin main
```

To make new repositories start with `main`: `git config --global init.defaultBranch main`.

## Cause 3: a typo or wrong case

Branch names are case-sensitive: `Main` and `main` are different branches. Copy the exact name from `git branch`.
