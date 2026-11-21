---
error: "CONFLICT (modify/delete): deleted in HEAD and modified in ..."
error_full: |
  CONFLICT (modify/delete): src/old.js deleted in HEAD and modified in feature. Version feature of src/old.js left in tree.
  Automatic merge failed; fix conflicts and then commit the result.
cat: git
description: "One side of a merge, rebase or cherry-pick deleted a file while the other side changed it. Git can't combine a deletion with an edit, so you must decide whether the file stays or goes."
tldr: "Keep the file: `git add path/to/file`. Delete it: `git rm path/to/file`. Then `git commit` (merge), `git rebase --continue` (rebase) or `git cherry-pick --continue`. Check `git status` for every `deleted by us` / `deleted by them` entry first."
keywords: git conflict modify/delete deleted in head and modified in left in tree deleted by us deleted by them merge rebase cherry-pick git rm git add rename
related: [git-merge-conflict, git-you-have-not-concluded-your-merge-merge-head-exists, git-cannot-pull-with-rebase-unstaged-changes]
---
## What it means

A normal content conflict has two versions of the same lines. A *modify/delete* conflict has one side where the file no longer exists. There are no conflict markers to edit; Git leaves the modified version in your working tree and waits for you to either keep it (`git add`) or remove it (`git rm`).

The message tells you which side did what:

- `deleted in HEAD and modified in feature`: your current branch deleted it, the branch being merged changed it.
- `deleted in feature and modified in HEAD`: the reverse.

```bash
git status
#   deleted by us:   src/old.js
#   deleted by them: docs/setup.md
```

During a **rebase** "us" and "them" are swapped: "us" is the branch you're rebasing onto, "them" is your commit being replayed.

## Fix 1: keep the modified file

The changes matter and the file should stay:

```bash
git add src/old.js
```

## Fix 2: accept the deletion

The file was removed on purpose and the edits are no longer needed:

```bash
git rm src/old.js
```

Before throwing the edits away, look at what they were, so you can port them if needed:

```bash
git log --oneline -p MERGE_HEAD -- src/old.js | head -50     # during a merge
git diff HEAD...MERGE_HEAD -- src/old.js
```

## Fix 3: the file was moved, not deleted

If one branch renamed or split the file and Git didn't detect the rename (too many changes), you get modify/delete instead of a clean merge. Apply the edits to the new location, then remove the old path:

```bash
git show MERGE_HEAD:src/old.js > /tmp/old.js   # their version
# copy the relevant changes into src/new.js
git add src/new.js
git rm src/old.js
```

Lowering the rename threshold sometimes lets Git do it automatically:

```bash
git merge --abort
git merge -X find-renames=30% feature
```

## Finish the operation

After every conflicted path is resolved (`git status` shows none under "Unmerged paths"):

```bash
git commit                   # merge
git rebase --continue        # rebase
git cherry-pick --continue   # cherry-pick
git stash drop               # after a conflicting "git stash pop" (resolve, then drop)
```

To start over: `git merge --abort`, `git rebase --abort` or `git cherry-pick --abort`.

## Many files at once

Resolving lots of these in one direction (e.g. a big directory that was deleted on main):

```bash
# accept all deletions done by "us"
git status --porcelain | awk '$1=="DU"{print $2}' | xargs -r git rm
# keep all files deleted by "them"
git status --porcelain | awk '$1=="UD"{print $2}' | xargs -r git add
```

In porcelain output, `DU` = deleted by us, `UD` = deleted by them.
