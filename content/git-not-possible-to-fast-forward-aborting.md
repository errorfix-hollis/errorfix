---
error: "fatal: Not possible to fast-forward, aborting."
error_full: |
  hint: Diverging branches can't be fast-forwarded, you need to either:
  hint:
  hint: 	git merge --no-ff
  hint:
  hint: or:
  hint:
  hint: 	git rebase
  hint:
  hint: Disable this message with "git config advice.diverging false"
  fatal: Not possible to fast-forward, aborting.
cat: git
description: Your local branch and the remote branch both have commits the other doesn't, and Git is configured to only allow fast-forward pulls (pull.ff=only or --ff-only), so it refuses to merge or rebase automatically.
tldr: "Choose how to combine the histories: `git pull --rebase` (linear history) or `git pull --no-ff` (merge commit). To set a default: `git config --global pull.rebase true`. If your local commits are junk, `git reset --hard origin/<branch>` (destroys them)."
keywords: git fatal not possible to fast-forward aborting diverging branches pull.ff only git pull rebase merge no-ff ff-only
related: [git-failed-to-push-some-refs, git-refusing-to-merge-unrelated-histories, git-merge-conflict]
---
## What it means

A *fast-forward* is possible only when your branch is strictly behind the remote: Git just moves your branch pointer forward. Here the branches have **diverged** — you made local commits and someone pushed other commits. Combining them needs a merge or rebase, and your config (`pull.ff = only`) or the `--ff-only` flag says "don't do that automatically".

See what diverged:

```bash
git fetch
git status                           # "have diverged, and have 2 and 3 different commits each"
git log --oneline --graph HEAD...origin/main
```

## Fix 1: rebase your commits on top (linear history)

```bash
git pull --rebase
# resolve conflicts if any, then:
git add <files> && git rebase --continue
git push
```

Make it the default:

```bash
git config --global pull.rebase true
```

## Fix 2: merge (keeps both histories)

```bash
git pull --no-ff
# or explicitly:
git fetch && git merge origin/main
```

Set as default with `git config --global pull.rebase false`.

## Fix 3: check what is forcing fast-forward only

```bash
git config --show-origin --get-all pull.ff
git config --show-origin --get-all merge.ff
```

If you see `only` and didn't intend it, remove it:

```bash
git config --global --unset pull.ff
```

`--ff-only` is a sensible default for avoiding surprise merge commits; just know you'll need to choose rebase or merge whenever branches diverge.

## Fix 4: you don't want your local commits

If the local commits were mistakes (or the remote was force-pushed and you want to match it):

```bash
git branch backup-mine           # optional safety copy
git reset --hard origin/main
```

`reset --hard` deletes uncommitted changes and local-only commits on that branch.

## Fix 5: the remote was rewritten

If a teammate force-pushed (rebased or amended), your branch "diverges" from commits you already have under different hashes. Rebase while skipping the old copies:

```bash
git fetch
git rebase --onto origin/main <old-upstream-commit> main
```

Or, if you have no work of your own on top, simply `git reset --hard origin/main`.

## Same error in merges

`git merge --ff-only feature` gives the same message when `feature` isn't a direct descendant of your current branch. Rebase `feature` onto the target first (`git switch feature && git rebase main`), then the fast-forward merge works.
