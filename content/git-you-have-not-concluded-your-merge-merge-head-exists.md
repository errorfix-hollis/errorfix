---
error: "fatal: You have not concluded your merge (MERGE_HEAD exists)."
error_full: |
  error: You have not concluded your merge (MERGE_HEAD exists).
  hint: Please, commit your changes before merging.
  fatal: Exiting because of unfinished merge.
cat: git
description: "A previous `git merge` or `git pull` stopped partway (usually on conflicts) and is still in progress. Git won't start another merge or pull until you finish or abort that one."
tldr: "To finish: resolve conflicts, `git add <files>`, then `git commit` (or `git merge --continue`). To throw the merge away: `git merge --abort` (or `git reset --merge`). Then run your `git pull` again."
keywords: git you have not concluded your merge merge_head exists exiting because of unfinished merge please commit your changes before merging git merge --abort git pull merge --continue
related: [git-merge-conflict, git-need-to-specify-how-to-reconcile-divergent-branches, git-your-local-changes-would-be-overwritten]
---
## What it means

When a merge can't complete automatically, Git writes `.git/MERGE_HEAD` (the commit being merged in) and leaves the working tree with conflict markers, waiting for you. Any new `git pull` or `git merge` sees `MERGE_HEAD` and refuses, because starting another merge would mix two merges together.

See where you are:

```bash
git status
```

You'll see `You have unmerged paths` (conflicts left) or `All conflicts fixed but you are still merging`.

## Fix 1: finish the merge

Resolve every conflicted file — remove the `<<<<<<<`, `=======`, `>>>>>>>` markers and keep the right content — then stage and commit:

```bash
git diff --name-only --diff-filter=U    # list files still conflicted
# edit them, then:
git add path/to/file
git commit                               # or: git merge --continue
```

`git commit` with no `-m` opens the prepared merge message; save and close the editor. You can also take one side wholesale:

```bash
git checkout --ours   path/to/file      # keep your version
git checkout --theirs path/to/file      # keep the incoming version
git add path/to/file
```

Then rerun the command that failed, e.g. `git pull`.

## Fix 2: abort and go back to before the merge

If you don't want the merge (or don't know what state you're in):

```bash
git merge --abort
```

This restores the branch to where it was before the merge started. If you had uncommitted changes before merging, `--abort` tries to keep them but can't always reconstruct them — commit or stash before merging next time.

If `--abort` fails (e.g. `MERGE_HEAD missing` or a broken state), use:

```bash
git reset --merge
```

`git reset --hard HEAD` also clears it, but **discards all uncommitted changes** in the working tree.

## Fix 3: the "merge" was a pull from an IDE or GUI

VS Code, IntelliJ and GitHub Desktop run `git pull` in the background. If it hit conflicts, the repository is mid-merge even though you never typed `git merge`. Open the terminal in that folder and use Fix 1 or 2. In VS Code, the Source Control panel lists conflicted files under *Merge Changes*.

## Similar messages for rebase and cherry-pick

The same idea applies to other operations, with different state files:

| Message mentions | In progress | Finish | Abort |
|---|---|---|---|
| `MERGE_HEAD` | merge | `git commit` | `git merge --abort` |
| `rebase-merge` / `rebase-apply` | rebase | `git rebase --continue` | `git rebase --abort` |
| `CHERRY_PICK_HEAD` | cherry-pick | `git cherry-pick --continue` | `git cherry-pick --abort` |
| `REVERT_HEAD` | revert | `git revert --continue` | `git revert --abort` |

## Avoiding it

- Commit or `git stash` local work before pulling.
- Pick a pull strategy once: `git config --global pull.rebase false` (merge) or `true` (rebase) — this also silences the "divergent branches" hint.
- Don't delete `.git/MERGE_HEAD` by hand: Git would then let you commit conflict markers as if nothing happened.
